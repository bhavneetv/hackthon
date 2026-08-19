import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Shield, ShieldCheck, Share2, Clock, Map as MapIcon, Bot, PhoneCall } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { searchNearbyPlaces, haversineDistance, reverseGeocode } from '../services/placesService'
import { getHelplines } from '../services/aiService'
import CheckInModal from '../components/CheckInModal'

export default function Home() {
  const navigate = useNavigate()
  const { toggleEmergency, userLocation, isMapLoaded, checkIn, locationError } = useApp()
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

  return (
    <div className="home-page">
      <header className="mb-4">
        <h1>{greeting}</h1>
        <p>Stay aware, stay safe.</p>
        {locationError && <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>{locationError}</p>}
      </header>

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
        <button className="action-btn emergency" onClick={() => { toggleEmergency(true); navigate('/emergency') }}>
          <Shield size={28} />
          <span>Emergency</span>
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
