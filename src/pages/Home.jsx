import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Shield, ShieldCheck, Share2, Clock, Map as MapIcon, Bot, PhoneCall, AlertTriangle, Radio, Bell, ShieldAlert } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { searchNearbyPlaces, haversineDistance, reverseGeocode } from '../services/placesService'
import { getHelplines } from '../services/aiService'
import CheckInModal from '../components/CheckInModal'

export default function Home() {
  const navigate = useNavigate()
  const {
    toggleEmergency, userLocation, isMapLoaded, checkIn, locationError,
    sosActive, sosData, triggerSOS, setShowSosModal, cancelSOS, nearbyCommunityUsers
  } = useApp()
  const [greeting, setGreeting] = useState('Good Day')
  const [nearbyPolice, setNearbyPolice] = useState(null)
  const [nearbyHospital, setNearbyHospital] = useState(null)
  const [destInput, setDestInput] = useState('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [aiHelplines, setAiHelplines] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [])

  // Fetch nearby places using REST API
  useEffect(() => {
    if (!userLocation) return
    const fetch = async () => {
      const police = await searchNearbyPlaces(userLocation.lat, userLocation.lng, 'police')
      if (police.length > 0) {
        const distKm = haversineDistance(userLocation.lat, userLocation.lng, police[0].lat, police[0].lng)
        const distStr = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)} km`
        setNearbyPolice({ name: police[0].name, distance: distStr, phone: police[0].phone })
      } else {
        setNearbyPolice({ name: 'Police Station Mullana', distance: '2 km' })
      }

      const hospitals = await searchNearbyPlaces(userLocation.lat, userLocation.lng, 'hospital')
      if (hospitals.length > 0) {
        const distKm = haversineDistance(userLocation.lat, userLocation.lng, hospitals[0].lat, hospitals[0].lng)
        const distStr = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)} km`
        setNearbyHospital({ name: hospitals[0].name, distance: distStr, phone: hospitals[0].phone })
      } else {
        setNearbyHospital({ name: 'MM Hospital, MMU, Mullana', distance: '300m' })
      }
    }
    fetch()
  }, [userLocation])

  const handleFetchAiHelplines = async () => {
    if (!userLocation) return
    setLoadingAi(true)
    const addr = await reverseGeocode(userLocation.lat, userLocation.lng)
    const locationName = addr ? `${addr.city || addr.town || addr.village || ''}, ${addr.state || ''}, ${addr.country || ''}` : null
    const res = await getHelplines(userLocation.lat, userLocation.lng, locationName)
    setAiHelplines(res.text)
    setLoadingAi(false)
  }

  const handleRouteSearch = () => {
    if (destInput.trim()) {
      navigate('/map', { state: { searchQuery: destInput } })
    } else {
      navigate('/map')
    }
  }

  const handleShareLocation = () => {
    if (!userLocation) return
    const msg = `Hey! Here's my live location: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`
    if (navigator.share) {
      navigator.share({ title: 'My Live Location', text: msg, url: `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` })
    } else {
      window.location.href = `sms:?body=${encodeURIComponent(msg)}`
    }
  }

  const usersWithin100mCount = nearbyCommunityUsers.filter(u => u.distMeters <= 100).length

  return (
    <div className="home-page">
      <header className="mb-4">
        <h1>{greeting}</h1>
        <p>Stay aware, stay safe.</p>
        {locationError && <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>{locationError}</p>}
      </header>

      {/* Active SOS Banner if SOS is active */}
      {sosActive && (
        <div className="glass-card mb-4" style={{ borderColor: '#FF4757', background: 'rgba(255, 71, 87, 0.12)' }}>
          <div className="flex-row justify-between align-center mb-2">
            <div className="flex-row gap-2 align-center">
              <span className="live-dot-pulse"></span>
              <h3 style={{ margin: 0, color: '#FF4757', fontSize: '16px' }}>🚨 SOS EMERGENCY ACTIVE</h3>
            </div>
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#FF4757' }} onClick={() => setShowSosModal(true)}>
              View Status
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            SMS sent to <strong>{sosData?.targetPhone || 'Emergency contact'}</strong>. Push alert sent to <strong>{sosData?.notifiedUsers?.length || usersWithin100mCount}</strong> users within 100m.
          </p>
        </div>
      )}

      {/* Hero SOS Panic Button Card */}
      <div className="glass-card hero-sos-card mb-4">
        <div className="hero-sos-content">
          <div className="hero-sos-badge flex-row gap-1 align-center">
            <Radio size={14} className="radar-spin text-danger" />
            <span>100m Proximity Protection ({usersWithin100mCount} active nearby)</span>
          </div>

          <button className="sos-panic-main-btn" onClick={() => triggerSOS()}>
            <div className="sos-btn-inner">
              <ShieldAlert size={40} />
              <span className="sos-btn-title">SOS</span>
              <span className="sos-btn-sub">EMERGENCY</span>
            </div>
          </button>

          <div className="hero-sos-footer">
            <div className="sos-feature-pill">
              <PhoneCall size={13} /> SMS to Emergency Contact
            </div>
            <div className="sos-feature-pill">
              <Bell size={13} /> Push Alert to Users &lt;100m
            </div>
          </div>
        </div>
      </div>

      {/* Active Check-in Banner */}
      {checkIn && <CheckInBanner checkIn={checkIn} />}

      {/* Route Planning */}
      <div className="glass-card mb-4">
        <div className="flex-row justify-between mb-2" style={{ alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Plan a Safe Route</h3>
          <MapPin size={20} className="text-primary" />
        </div>
        <div className="mb-2">
          <div className="form-input mb-2" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>📍 From: Current Location</div>
          <input
            className="form-input"
            placeholder="🔍 To: Where are you going?"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
          />
        </div>
        <button className="btn btn-primary btn-block" onClick={handleRouteSearch}>Find Routes</button>
      </div>

      {/* Quick Actions */}
      <h3 className="mb-2">Quick Actions</h3>
      <div className="quick-actions-grid mb-4">
        <button className="action-btn emergency" onClick={() => triggerSOS()}>
          <Shield size={28} />
          <span>SOS Alert</span>
        </button>
        <button className="action-btn" onClick={handleShareLocation}>
          <Share2 size={24} />
          <span>Share Loc</span>
        </button>
        <button className="action-btn" onClick={() => setShowCheckIn(true)}>
          <Clock size={24} />
          <span>Check-in</span>
        </button>
        <button className="action-btn" onClick={() => navigate('/map')}>
          <MapIcon size={24} />
          <span>View Map</span>
        </button>
      </div>

      {/* AI Helplines Quick Card on Home Page */}
      <div className="glass-card mb-4" style={{ borderColor: 'var(--primary)' }}>
        <div className="flex-row justify-between mb-2" style={{ alignItems: 'center' }}>
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <Bot className="text-primary" size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>AI Local Helplines</h3>
          </div>
          <button className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleFetchAiHelplines} disabled={loadingAi}>
            {loadingAi ? 'Fetching...' : aiHelplines ? 'Refresh' : 'Get Helplines'}
          </button>
        </div>

        {aiHelplines ? (
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6', padding: '10px', background: 'var(--surface-light)', borderRadius: '10px' }}>
            {aiHelplines}
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Tap <strong>Get Helplines</strong> to instantly fetch local emergency numbers for your location via Groq AI.
          </p>
        )}
      </div>

      {/* Nearby Status */}
      <div className="glass-card mb-4">
        <div className="flex-row justify-between mb-2">
          <h3 style={{ margin: 0 }}>Nearby Status</h3>
          <ShieldCheck size={20} className="text-success" />
        </div>
        <div className="flex-col gap-3">
          <NearbyRow emoji="🚔" label="Nearest Police" value={nearbyPolice?.distance || 'Searching...'} sub={nearbyPolice?.name} phone={nearbyPolice?.phone} />
          <NearbyRow emoji="🏥" label="Nearest Hospital" value={nearbyHospital?.distance || 'Searching...'} sub={nearbyHospital?.name} phone={nearbyHospital?.phone} />
        </div>
      </div>

      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}

      <style dangerouslySetInnerHTML={{__html: `
        .quick-actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .action-btn { background: var(--surface); border: 1px solid var(--glass-border); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 14px 8px; color: var(--text-main); font-size: 12px; font-weight: 500; cursor: pointer; transition: transform 0.1s; }
        .action-btn:active { transform: scale(0.95); }
        .action-btn.emergency { background: rgba(255,71,87,0.1); border-color: var(--danger); color: var(--danger); }

        .hero-sos-card {
          background: radial-gradient(circle at center, rgba(255, 71, 87, 0.15) 0%, rgba(20, 27, 45, 0.95) 100%);
          border: 1px solid rgba(255, 71, 87, 0.35);
          text-align: center;
          padding: 24px 16px 18px;
          box-shadow: 0 12px 35px rgba(255, 71, 87, 0.18);
        }

        .hero-sos-badge {
          display: inline-flex;
          align-items: center;
          background: rgba(255, 71, 87, 0.15);
          color: #FF4757;
          border: 1px solid rgba(255, 71, 87, 0.3);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .sos-panic-main-btn {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #FF4757 0%, #C0392B 100%);
          box-shadow: 0 0 0 12px rgba(255, 71, 87, 0.2), 0 0 30px rgba(255, 71, 87, 0.5);
          color: white;
          cursor: pointer;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.15s;
          animation: mainPanicPulse 2s infinite;
        }

        .sos-panic-main-btn:active {
          transform: scale(0.92);
          box-shadow: 0 0 0 6px rgba(255, 71, 87, 0.3), 0 0 15px rgba(255, 71, 87, 0.8);
        }

        .sos-btn-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .sos-btn-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 2px;
          line-height: 1;
        }

        .sos-btn-sub {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          opacity: 0.9;
        }

        .hero-sos-footer {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sos-feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255,255,255,0.04);
          padding: 6px 10px;
          border-radius: 8px;
        }

        .live-dot-pulse {
          width: 10px;
          height: 10px;
          background: #FF4757;
          border-radius: 50%;
          display: inline-block;
          animation: sosPulse 1.2s infinite;
        }

        @keyframes mainPanicPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4), 0 0 20px rgba(255, 71, 87, 0.4); }
          70% { box-shadow: 0 0 0 18px rgba(255, 71, 87, 0), 0 0 35px rgba(255, 71, 87, 0.7); }
          100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0), 0 0 20px rgba(255, 71, 87, 0.4); }
        }
      `}} />
    </div>
  )
}

function NearbyRow({ emoji, label, value, sub, phone }) {
  return (
    <div>
      <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{emoji} {label}</span>
        <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{value}</span>
          {phone && <a href={`tel:${phone}`} style={{ color: 'var(--primary)', fontSize: '12px', textDecoration: 'none' }}>📞</a>}
        </div>
      </div>
      {sub && sub !== 'None found' && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function CheckInBanner({ checkIn }) {
  const [timeLeft, setTimeLeft] = useState('')
  const { confirmArrival, cancelCheckIn } = useApp()

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = checkIn.endTime - Date.now()
      if (diff <= 0) { setTimeLeft('EXPIRED'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [checkIn])

  return (
    <div className="glass-card mb-4" style={{ borderColor: 'var(--warning)', background: 'rgba(255,165,2,0.05)' }}>
      <div className="flex-row justify-between mb-1" style={{ alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>🕐 Check-In Active</span>
        <span style={{ fontWeight: 700, color: timeLeft === 'EXPIRED' ? 'var(--danger)' : 'var(--warning)' }}>{timeLeft}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>To: {checkIn.destination}</div>
      <div className="flex-row gap-2">
        <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '13px' }} onClick={confirmArrival}>✅ I Arrived</button>
        <button className="btn btn-glass" style={{ flex: 1, padding: '8px', fontSize: '13px' }} onClick={cancelCheckIn}>Cancel</button>
      </div>
    </div>
  )
}
