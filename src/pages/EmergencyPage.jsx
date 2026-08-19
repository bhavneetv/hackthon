import { useEffect, useState } from 'react'
import { Phone, Navigation, Share2, XCircle, MapPin } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { searchNearbyPlaces, haversineDistance } from '../services/placesService'
import AudioDetector from '../components/AudioDetector'

export default function EmergencyPage() {
  const { emergencyMode, toggleEmergency, trustedContacts, userLocation, audioDetectionEnabled } = useApp()
  const [nearestPolice, setNearestPolice] = useState(null)
  const [nearestHospital, setNearestHospital] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!emergencyMode) toggleEmergency(true)
  }, [])

  // Fetch nearby facilities using REST API
  useEffect(() => {
    if (!userLocation) return
    const fetchHelp = async () => {
      setLoading(true)
      const [police, hospitals] = await Promise.all([
        searchNearbyPlaces(userLocation.lat, userLocation.lng, 'police'),
        searchNearbyPlaces(userLocation.lat, userLocation.lng, 'hospital')
      ])

      if (police.length > 0) {
        const d = haversineDistance(userLocation.lat, userLocation.lng, police[0].lat, police[0].lng)
        setNearestPolice({ ...police[0], distance: d.toFixed(1) + ' km' })
      }
      if (hospitals.length > 0) {
        const d = haversineDistance(userLocation.lat, userLocation.lng, hospitals[0].lat, hospitals[0].lng)
        setNearestHospital({ ...hospitals[0], distance: d.toFixed(1) + ' km' })
      }
      setLoading(false)
    }
    fetchHelp()
  }, [userLocation])

  const handleCall = (number) => {
    if (number) window.location.href = `tel:${number.replace(/[^0-9+]/g, '')}`
  }

  const handleShare = () => {
    const loc = userLocation ? `${userLocation.lat},${userLocation.lng}` : 'unknown'
    const msg = `🚨 EMERGENCY! I need help NOW!\n📍 My location: https://maps.google.com/?q=${loc}\n\nSent via SafeRoute`

    if (navigator.share) {
      navigator.share({ title: 'EMERGENCY - SafeRoute', text: msg })
    } else {
      window.location.href = `sms:?body=${encodeURIComponent(msg)}`
    }
  }

  const handleCancel = () => {
    toggleEmergency(false)
    window.history.back()
  }

  return (
    <div className="emergency-page">
      {/* Header */}
      <div className="emergency-header mb-4">
        <h1 className="text-danger" style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '2px' }}>
          <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>🚨</span> Emergency
        </h1>
        <p style={{ textAlign: 'center', fontSize: '13px' }}>Mode Active · Tap to call immediately</p>
      </div>

      {/* Primary Call Buttons - BIG for panic situations */}
      <div className="flex-col gap-3 mb-4">
        <button className="btn btn-danger btn-block emergency-pulse" style={{ padding: '22px', fontSize: '22px', borderRadius: '20px', fontWeight: 700 }} onClick={() => handleCall('112')}>
          <Phone size={30} /> CALL POLICE (112)
        </button>
        <button className="btn btn-block" style={{ background: '#FFA502', color: 'white', padding: '18px', fontSize: '18px', borderRadius: '16px', fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={() => handleCall('108')}>
          <Phone size={26} /> CALL AMBULANCE (108)
        </button>
      </div>

      {/* Nearest Help Cards */}
      {!loading && (
        <div className="flex-col gap-3 mb-4">
          {nearestPolice && (
            <FacilityCard icon="🚔" label="Nearest Police" facility={nearestPolice} onCall={handleCall} />
          )}
          {nearestHospital && (
            <FacilityCard icon="🏥" label="Nearest Hospital" facility={nearestHospital} onCall={handleCall} />
          )}
        </div>
      )}
      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '16px' }}>Finding nearest help...</p>}

      {/* Share & Navigate */}
      <div className="flex-row gap-3 mb-4">
        <button className="btn btn-glass" style={{ flex: 1, padding: '14px', flexDirection: 'column', gap: '4px' }} onClick={handleShare}>
          <Share2 size={22} />
          <span style={{ fontSize: '12px' }}>Share Location</span>
        </button>
        {userLocation && (
          <a href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=nearest+police+station`} target="_blank" rel="noreferrer" className="btn btn-glass" style={{ flex: 1, padding: '14px', flexDirection: 'column', gap: '4px', textDecoration: 'none' }}>
            <Navigation size={22} />
            <span style={{ fontSize: '12px' }}>Navigate to Help</span>
          </a>
        )}
      </div>

      {/* Trusted Contacts */}
      {trustedContacts.length > 0 && (
        <div className="glass-card mb-4">
          <h3 className="mb-2" style={{ fontSize: '15px' }}>Trusted Contacts</h3>
          <div className="flex-col gap-2">
            {trustedContacts.map((contact, i) => (
              <button key={i} className="btn btn-glass justify-between" style={{ padding: '12px' }} onClick={() => handleCall(contact.phone)}>
                <span>{contact.name}</span>
                <Phone size={18} className="text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Cancel */}
      <button className="btn btn-glass btn-block" style={{ padding: '14px', color: 'var(--text-muted)', marginTop: 'auto' }} onClick={handleCancel}>
        <XCircle size={22} /> CANCEL EMERGENCY
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .emergency-page { min-height: calc(100vh - var(--nav-height) - 40px); display: flex; flex-direction: column; }
      `}} />
    </div>
  )
}

function FacilityCard({ icon, label, facility, onCall }) {
  return (
    <div className="glass-card" style={{ padding: '12px', borderColor: 'var(--primary)' }}>
      <div className="flex-row justify-between mb-1" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{icon} {label}</span>
        <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{facility.distance}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{facility.name}</div>
      <div className="flex-row gap-2">
        {facility.phone && (
          <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '13px' }} onClick={() => onCall(facility.phone)}>
            <Phone size={16} /> Call {facility.phone}
          </button>
        )}
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`} target="_blank" rel="noreferrer"
          className="btn btn-glass" style={{ flex: 1, padding: '8px', fontSize: '13px', textDecoration: 'none', textAlign: 'center' }}>
          <Navigation size={16} /> Navigate
        </a>
      </div>
    </div>
  )
}
