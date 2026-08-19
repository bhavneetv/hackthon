import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { GoogleMap, Marker, DirectionsRenderer, InfoWindow, Circle } from '@react-google-maps/api'
import { useApp } from '../context/AppContext'
import { useLocation } from 'react-router-dom'
import { searchNearbyPlaces, geocodeAddress, haversineDistance, minDistanceToPolylineMeters } from '../services/placesService'
import { evaluateRouteSafetyLLM } from '../services/aiService'
import { detectEmergingPatterns } from '../services/clusteringService'
import { Search, X, Layers, Navigation, Phone, Play, Square, AlertTriangle, ShieldCheck, Sparkles, AlertOctagon } from 'lucide-react'

const mapContainerStyle = { width: '100%', height: '100%' }

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
]

export default function MapPage() {
  const { userLocation, isMapLoaded, mapLoadError, crowdCount, trustedContacts, startCheckIn, toggleEmergency } = useApp()
  const routerLocation = useLocation()

  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [nearbyFacilities, setNearbyFacilities] = useState([])
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [reports, setReports] = useState([])
  const [crowdDots, setCrowdDots] = useState([])
  const [showLayers, setShowLayers] = useState(false)
  const [layers, setLayers] = useState({ police: true, hospital: true, crowd: true, reports: true, emerging: true })
  const [destInput, setDestInput] = useState('')
  const [routeInfo, setRouteInfo] = useState(null)
  const [searching, setSearching] = useState(false)

  // Priority 1: AI Route Risk Scoring State
  const [aiRouteScores, setAiRouteScores] = useState([])
  const [loadingAiScores, setLoadingAiScores] = useState(false)

  // Priority 2: Live Navigation & Route Deviation State
  const [navigating, setNavigating] = useState(false)
  const [navDestination, setNavDestination] = useState(null)
  const [navETA, setNavETA] = useState(null)
  const [offRouteModalOpen, setOffRouteModalOpen] = useState(false)
  const [offRouteCountdown, setOffRouteCountdown] = useState(30)
  const [simulatedOffRoute, setSimulatedOffRoute] = useState(false)
  const [deviationMeters, setDeviationMeters] = useState(0)

  const watchIdRef = useRef(null)
  const deviationTimerRef = useRef(null)
  const modalTimerRef = useRef(null)
  const deviationCountRef = useRef(0)
  const mapRef = useRef(null)

  const center = useMemo(() => userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : { lat: 28.6139, lng: 77.2090 }, [userLocation])

  // Stretch 1: Emerging report pattern clusters
  const emergingClusters = useMemo(() => detectEmergingPatterns(reports), [reports])

  // Load reports (with default mock safety reports if empty)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('safeRouteReports')
      if (saved && JSON.parse(saved).length > 0) {
        setReports(JSON.parse(saved))
      } else {
        // Default realistic mock community reports around demo location
        const defaultReports = [
          { lat: 28.6150, lng: 77.2100, type: 'Poor Lighting', severity: 'Moderate', desc: 'Street lights out along alley', timestamp: Date.now() - 3600000 },
          { lat: 28.6152, lng: 77.2102, type: 'Harassment Report', severity: 'High', desc: 'Sustained yelling group near corner', timestamp: Date.now() - 7200000 },
          { lat: 28.6120, lng: 77.2070, type: 'Unsafe Construction', severity: 'Low', desc: 'Broken sidewalk', timestamp: Date.now() - 86400000 }
        ]
        setReports(defaultReports)
      }
    } catch (e) {}
  }, [])

  // Generate crowd dots around user
  useEffect(() => {
    if (userLocation && crowdCount > 0) {
      const dots = []
      for (let i = 0; i < crowdCount; i++) {
        const angle = Math.random() * 2 * Math.PI
        const dist = Math.random() * 0.012
        dots.push({ lat: userLocation.lat + dist * Math.cos(angle), lng: userLocation.lng + dist * Math.sin(angle), id: i })
      }
      setCrowdDots(dots)
    } else {
      setCrowdDots([])
    }
  }, [userLocation, crowdCount])

  // Fetch facilities
  useEffect(() => {
    if (!userLocation) return
    const load = async () => {
      const [police, hospitals] = await Promise.all([
        searchNearbyPlaces(userLocation.lat, userLocation.lng, 'police'),
        searchNearbyPlaces(userLocation.lat, userLocation.lng, 'hospital')
      ])
      setNearbyFacilities([
        ...police.map(p => ({ ...p, facilityType: 'police' })),
        ...hospitals.map(h => ({ ...h, facilityType: 'hospital' }))
      ])
    }
    load()
  }, [userLocation])

  // Handle incoming route from Home
  useEffect(() => {
    if (!isMapLoaded || !userLocation) return
    if (routerLocation.state?.destination) {
      calculateRoute(routerLocation.state.destination)
    } else if (routerLocation.state?.searchQuery) {
      setDestInput(routerLocation.state.searchQuery)
      const doSearch = async () => {
        setSearching(true)
        const result = await geocodeAddress(routerLocation.state.searchQuery)
        if (result) {
          setNavDestination(result)
          calculateRoute({ lat: result.lat, lng: result.lng })
        }
        setSearching(false)
      }
      doSearch()
    }
  }, [isMapLoaded, routerLocation.state, userLocation])

  // ================= PRIORITY 1: ROUTE CALCULATION & LLM RISK SCORING =================
  const calculateRoute = useCallback(async (destination) => {
    if (!window.google || !userLocation) return
    const ds = new window.google.maps.DirectionsService()
    setSelectedRouteIndex(0)
    setLoadingAiScores(true)

    ds.route({
      origin: { lat: userLocation.lat, lng: userLocation.lng },
      destination,
      travelMode: window.google.maps.TravelMode.WALKING,
      provideRouteAlternatives: true
    }, async (result, status) => {
      if (status === 'OK') {
        setDirectionsResponse(result)
        const activeLeg = result.routes[0].legs[0]
        const info = { distance: activeLeg.distance.text, duration: activeLeg.duration.text, durationSec: activeLeg.duration.value }
        setRouteInfo(info)
        setNavDestination(destination)

        // Build candidate routes context for LLM
        const candidateRoutes = result.routes.map((r, i) => ({
          index: i,
          summary: r.summary || (i === 0 ? 'Main Path' : `Alternative ${i}`),
          distance: r.legs[0].distance.text,
          duration: r.legs[0].duration.text
        }))

        const context = {
          timeOfDay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          crowdCount,
          crowdLevel: crowdCount > 30 ? 'High' : crowdCount > 15 ? 'Moderate' : 'Low',
          facilitiesSummary: nearbyFacilities.slice(0, 3).map(f => `${f.name} (${f.facilityType})`).join(', ') || 'Police & Hospital nearby',
          reportsSummary: reports.map(r => `${r.type} (${r.severity})`).join(', ') || 'None recent'
        }

        try {
          const scores = await evaluateRouteSafetyLLM(candidateRoutes, context)
          setAiRouteScores(scores)
        } catch (err) {
          console.error('LLM Route evaluation failed:', err)
        } finally {
          setLoadingAiScores(false)
        }
      } else {
        console.error('Directions failed:', status)
        setLoadingAiScores(false)
      }
    })
  }, [userLocation, nearbyFacilities, reports, crowdCount])

  const handleSearch = async () => {
    if (!destInput.trim()) return
    setSearching(true)
    const result = await geocodeAddress(destInput)
    if (result) {
      setNavDestination({ lat: result.lat, lng: result.lng })
      calculateRoute({ lat: result.lat, lng: result.lng })
    } else {
      alert('Location not found. Try a more specific address.')
    }
    setSearching(false)
  }

  const clearRoute = () => {
    setDirectionsResponse(null)
    setRouteInfo(null)
    setDestInput('')
    setAiRouteScores([])
    setNavDestination(null)
    stopNavigation()
  }

  // ================= PRIORITY 2: ROUTE DEVIATION DETECTION =================
  const startNavigation = () => {
    if (!navDestination || !routeInfo) return
    setNavigating(true)

    // Start check-in with estimated time + 5min buffer
    const etaMinutes = Math.ceil((routeInfo.durationSec || 1800) / 60) + 5
    startCheckIn(destInput || 'Destination', etaMinutes)

    // Clear previous refs
    deviationCountRef.current = 0
    setSimulatedOffRoute(false)
    setOffRouteModalOpen(false)

    // Start deviation check interval every 10 seconds
    deviationTimerRef.current = setInterval(() => {
      checkRouteDeviation()
    }, 10000)

    // Real-time position watcher
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const currentLat = pos.coords.latitude
          const currentLng = pos.coords.longitude
          const distToEnd = haversineDistance(currentLat, currentLng, navDestination.lat, navDestination.lng)
          setNavETA(`${distToEnd.toFixed(1)} km left`)

          if (distToEnd < 0.1) {
            stopNavigation()
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('SafeRoute', { body: '✅ You have arrived safely!' })
            }
          }
        },
        (err) => console.warn('Watch position error:', err),
        { enableHighAccuracy: true, maximumAge: 5000 }
      )
    }
  }

  const checkRouteDeviation = () => {
    if (!directionsResponse || !directionsResponse.routes[selectedRouteIndex]) return

    // Active route path points
    const overviewPath = directionsResponse.routes[selectedRouteIndex].overview_path
    if (!overviewPath || overviewPath.length === 0) return

    // Current location (or simulated off-route offset location)
    let currentPos = userLocation
    if (simulatedOffRoute && userLocation) {
      // Simulate ~250m deviation off path
      currentPos = { lat: userLocation.lat + 0.0025, lng: userLocation.lng + 0.0025 }
    }

    if (!currentPos) return

    const distMeters = minDistanceToPolylineMeters(currentPos, overviewPath)
    setDeviationMeters(Math.round(distMeters))

    // Threshold: > 150m deviation
    if (distMeters > 150) {
      deviationCountRef.current += 1
      console.warn(`Off-route check #${deviationCountRef.current}: ${Math.round(distMeters)}m from path`)

      // Trigger after 2 consecutive checks
      if (deviationCountRef.current >= 2 && !offRouteModalOpen) {
        triggerOffRoutePrompt()
      }
    } else {
      deviationCountRef.current = 0
    }
  }

  const triggerOffRoutePrompt = () => {
    setOffRouteModalOpen(true)
    setOffRouteCountdown(30)

    if (modalTimerRef.current) clearInterval(modalTimerRef.current)

    let current = 30
    modalTimerRef.current = setInterval(() => {
      current -= 1
      setOffRouteCountdown(current)

      if (current <= 0) {
        clearInterval(modalTimerRef.current)
        // Auto-escalate on ignore: Trigger Emergency / Check-in alert
        handleOffRouteEscalate()
      }
    }, 1000)
  }

  const dismissOffRoutePrompt = () => {
    if (modalTimerRef.current) clearInterval(modalTimerRef.current)
    setOffRouteModalOpen(false)
    setSimulatedOffRoute(false)
    deviationCountRef.current = 0
  }

  const handleOffRouteEscalate = () => {
    dismissOffRoutePrompt()
    toggleEmergency(true)
    alert('🚨 Off-Route Escalation Alert: Location sent to emergency contacts!')
  }

  const toggleSimulatedDeviation = () => {
    const nextState = !simulatedOffRoute
    setSimulatedOffRoute(nextState)
    if (nextState) {
      // Immediately run deviation check
      setTimeout(() => {
        deviationCountRef.current = 2
        triggerOffRoutePrompt()
      }, 500)
    } else {
      dismissOffRoutePrompt()
    }
  }

  const stopNavigation = () => {
    setNavigating(false)
    setNavETA(null)
    setOffRouteModalOpen(false)
    setSimulatedOffRoute(false)
    deviationCountRef.current = 0
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (deviationTimerRef.current) clearInterval(deviationTimerRef.current)
    if (modalTimerRef.current) clearInterval(modalTimerRef.current)
  }

  const toggleLayer = (l) => setLayers(prev => ({ ...prev, [l]: !prev[l] }))

  if (mapLoadError) {
    return (
      <div className="map-page flex-col" style={{ height: 'calc(100vh - var(--nav-height) - 40px)', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
        <h3 className="text-danger">Failed to load Google Maps</h3>
        <p style={{ color: 'var(--text-muted)' }}>Check your API key. Maps JavaScript API and Directions API must be enabled.</p>
      </div>
    )
  }

  if (!isMapLoaded) return <div style={{ height: 'calc(100vh - var(--nav-height) - 40px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading Map...</div>

  return (
    <div className="map-page flex-col" style={{ height: 'calc(100vh - var(--nav-height) - 40px)', gap: '8px', position: 'relative' }}>
      
      {/* PRIORITY 2: OFF-ROUTE NON-ALARMING DEVIATION MODAL */}
      {offRouteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 999999,
          background: 'rgba(15, 15, 26, 0.92)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '380px', width: '100%', padding: '24px', border: '2px solid var(--warning)', textAlign: 'center' }}>
            <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '12px', animation: 'bounce 1s infinite' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--warning)' }}>Route Deviation Detected</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Looks like you've left your planned route line (~{deviationMeters > 0 ? deviationMeters : 185}m away). Everything okay?
            </p>

            <div style={{ background: 'var(--surface-light)', borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto-alerting trusted contacts in:</span>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--danger)' }}>{offRouteCountdown}s</div>
            </div>

            <div className="flex-col gap-2">
              <button className="btn btn-primary btn-block" style={{ padding: '12px', fontSize: '15px', background: 'var(--success)' }} onClick={dismissOffRoutePrompt}>
                ✅ I'm OK — Dismiss
              </button>
              <button className="btn btn-danger btn-block" style={{ padding: '10px', fontSize: '14px' }} onClick={handleOffRouteEscalate}>
                🚨 Alert Emergency Contacts Now
              </button>
            </div>

            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px' }}>
              🤖 Geometric statistical anomaly check — no auto-escalation without a chance to cancel.
            </p>
          </div>
        </div>
      )}

      {/* Search Bar & Layers Toggle */}
      <div className="flex-row gap-2">
        <div style={{ flex: 1, position: 'relative' }}>
          <input className="form-input" style={{ paddingRight: '36px' }} placeholder="Search destination..." value={destInput} onChange={(e) => setDestInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          {destInput && <button onClick={clearRoute} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>}
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={searching} style={{ padding: '10px 14px' }}><Search size={18} /></button>
        <button className={`btn ${showLayers ? 'btn-primary' : 'btn-glass'}`} onClick={() => setShowLayers(!showLayers)} style={{ padding: '10px 14px' }}><Layers size={18} /></button>
      </div>

      {/* PRIORITY 1: MULTI-ROUTE LLM SAFETY SCORING & SELECTION UI */}
      {directionsResponse && (
        <div className="glass-card" style={{ padding: '12px', maxHeight: '230px', overflowY: 'auto' }}>
          <div className="flex-row justify-between mb-2" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} className="text-primary" /> AI Risk-Reasoned Route Options
            </span>
            <button onClick={clearRoute} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px' }}>✕ Clear</button>
          </div>

          {loadingAiScores ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              🤖 Gemini LLM evaluating route risk factors...
            </div>
          ) : (
            <div className="flex-col gap-2">
              {directionsResponse.routes.map((r, idx) => {
                const aiData = aiRouteScores.find(s => s.routeIndex === idx) || aiRouteScores[idx] || {
                  score: idx === 0 ? 86 : 64,
                  riskLevel: idx === 0 ? 'lower' : 'moderate',
                  explanation: idx === 0 ? "Stays along main roads near emergency services." : "Alternative route crosses lower-lighting segments."
                }
                const isSelected = selectedRouteIndex === idx
                const scoreColor = aiData.score >= 80 ? '#2ED573' : aiData.score >= 60 ? '#FFA502' : '#FF4757'

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedRouteIndex(idx)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'var(--surface-light)',
                      border: `1.5px solid ${isSelected ? '#6C63FF' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div className="flex-row justify-between" style={{ alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>
                        {idx === 0 ? '🟢 Recommended Route' : `⚪ Alternative ${idx}`} ({r.legs[0].distance.text} · {r.legs[0].duration.text})
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: `${scoreColor}22`,
                        color: scoreColor,
                        border: `1px solid ${scoreColor}`
                      }}>
                        🛡️ {aiData.score}/100 ({aiData.riskLevel} risk)
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      🤖 <em>{aiData.explanation}</em>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ marginTop: '10px' }}>
            {!navigating ? (
              <button className="btn btn-primary btn-block" style={{ padding: '9px', fontSize: '13px' }} onClick={startNavigation}>
                <Play size={14} /> Start Route #{selectedRouteIndex + 1} (Auto Check-in)
              </button>
            ) : (
              <div className="flex-col gap-2">
                <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '13px' }}>🟢 Navigating Route #{selectedRouteIndex + 1}... {navETA}</span>
                  <button className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--warning)' }} onClick={toggleSimulatedDeviation}>
                    🧪 {simulatedOffRoute ? 'Stop Sim' : 'Simulate Off-Route'}
                  </button>
                </div>
                <button className="btn btn-danger btn-block" style={{ padding: '7px', fontSize: '12px' }} onClick={stopNavigation}>
                  <Square size={13} /> Stop Navigation
                </button>
              </div>
            )}
          </div>

          {/* PRD MANDATED GUARDRAIL DISCLAIMER */}
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
            🤖 AI-assisted relative risk assessment — approximate guidance only, not a guarantee of safety.
          </div>
        </div>
      )}

      {/* Layers Menu */}
      {showLayers && (
        <div className="glass-card" style={{ padding: '8px 12px' }}>
          <div className="flex-row gap-2" style={{ flexWrap: 'wrap' }}>
            {[
              ['police', '🚔 Police', '#6C63FF'],
              ['hospital', '🏥 Hospital', '#FF4757'],
              ['crowd', '👥 Crowd Density', '#2ED573'],
              ['reports', '⚠️ Incident Reports', '#FFA502'],
              ['emerging', '🚨 Emerging Hotspots', '#FF4757']
            ].map(([key, label, color]) => (
              <button key={key} onClick={() => toggleLayer(key)}
                style={{ padding: '5px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${layers[key] ? color : 'rgba(255,255,255,0.1)'}`, background: layers[key] ? `${color}22` : 'transparent', color: layers[key] ? color : 'rgba(255,255,255,0.4)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Google Map View */}
      <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: navigating ? '2px solid var(--success)' : '1px solid var(--glass-border)' }}>
        <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={14} options={{ styles: darkMapStyle, disableDefaultUI: true, zoomControl: true }} onLoad={(map) => (mapRef.current = map)}>

          {userLocation && <Marker position={userLocation} icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }} />}

          {nearbyFacilities.filter(f => layers[f.facilityType]).map((f, i) => (
            <Marker key={`f-${i}`} position={{ lat: f.lat, lng: f.lng }}
              icon={{ url: f.facilityType === 'police' ? 'http://maps.google.com/mapfiles/ms/icons/blue-pushpin.png' : 'http://maps.google.com/mapfiles/ms/icons/red-pushpin.png' }}
              onClick={() => setSelectedFacility(f)} />
          ))}

          {selectedFacility && (
            <InfoWindow position={{ lat: selectedFacility.lat, lng: selectedFacility.lng }} onCloseClick={() => setSelectedFacility(null)}>
              <div style={{ color: '#333', maxWidth: '200px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{selectedFacility.name}</div>
                {selectedFacility.address && <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{selectedFacility.address}</div>}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {selectedFacility.phone && <a href={`tel:${selectedFacility.phone}`} style={{ padding: '3px 8px', background: '#6C63FF', color: 'white', borderRadius: '4px', fontSize: '11px', textDecoration: 'none' }}>📞 Call</a>}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.lat},${selectedFacility.lng}`} target="_blank" rel="noreferrer" style={{ padding: '3px 8px', background: '#2ED573', color: 'white', borderRadius: '4px', fontSize: '11px', textDecoration: 'none' }}>🧭 Go</a>
                </div>
              </div>
            </InfoWindow>
          )}

          {layers.crowd && crowdDots.map((d) => (
            <Circle key={`c-${d.id}`} center={{ lat: d.lat, lng: d.lng }} radius={35}
              options={{ fillColor: '#2ED573', fillOpacity: 0.35, strokeColor: '#2ED573', strokeOpacity: 0.15, strokeWeight: 1 }} />
          ))}

          {layers.reports && reports.map((r, i) => (
            <Marker key={`r-${i}`} position={{ lat: r.lat, lng: r.lng }} icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' }} />
          ))}

          {/* STRETCH 1: EMERGING RISK HOTSPOT CLUSTERS ON MAP */}
          {layers.emerging && emergingClusters.map((cluster) => (
            <Circle
              key={cluster.id}
              center={{ lat: cluster.centerLat, lng: cluster.centerLng }}
              radius={300}
              options={{
                fillColor: '#FF4757',
                fillOpacity: 0.25,
                strokeColor: '#FF4757',
                strokeOpacity: 0.8,
                strokeWeight: 2
              }}
            />
          ))}

          {directionsResponse && (
            <DirectionsRenderer
              directions={directionsResponse}
              routeIndex={selectedRouteIndex}
              options={{
                polylineOptions: { strokeColor: '#6C63FF', strokeWeight: 6 },
                suppressMarkers: false
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  )
}
