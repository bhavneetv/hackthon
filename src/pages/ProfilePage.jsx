import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getHelplines } from '../services/aiService'
import { reverseGeocode } from '../services/placesService'
import AudioDetector from '../components/AudioDetector'
import { Mic, Plus, Trash2, Shield, Bot, Users, Bell, MapPin, Volume2 } from 'lucide-react'

export default function ProfilePage() {
  const {
    trustedContacts, setTrustedContacts,
    audioDetectionEnabled, setAudioDetectionEnabled,
    audioThreshold, setAudioThreshold,
    crowdCount, setCrowdCount,
    userLocation
  } = useApp()

  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' })
  const [calibrating, setCalibrating] = useState(false)
  const [helplines, setHelplines] = useState(null)
  const [loadingHelplines, setLoadingHelplines] = useState(false)

  const handleAddContact = () => {
    if (newContact.name && newContact.phone) {
      const updated = [...trustedContacts, newContact]
      setTrustedContacts(updated)
      localStorage.setItem('trustedContacts', JSON.stringify(updated))
      setNewContact({ name: '', phone: '', relationship: '' })
      setShowAddContact(false)
    }
  }

  const handleRemoveContact = (index) => {
    const updated = trustedContacts.filter((_, i) => i !== index)
    setTrustedContacts(updated)
    localStorage.setItem('trustedContacts', JSON.stringify(updated))
  }

  const startCalibration = async () => {
    setCalibrating(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      const mic = ctx.createMediaStreamSource(stream)
      mic.connect(analyser)
      const data = new Float32Array(analyser.fftSize)

      let maxDb = 0
      const start = Date.now()
      const measure = () => {
        if (Date.now() - start > 3000) {
          mic.disconnect()
          ctx.close()
          stream.getTracks().forEach(t => t.stop())
          const newThreshold = Math.min(Math.round(maxDb + 15), 95)
          setAudioThreshold(newThreshold)
          setCalibrating(false)
          return
        }
        analyser.getFloatTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
        const rms = Math.sqrt(sum / data.length)
        const db = Math.max(0, Math.min(100, Math.round(20 * Math.log10(rms + 0.0001) + 100)))
        if (db > maxDb) maxDb = db
        requestAnimationFrame(measure)
      }
      measure()
    } catch (err) {
      setCalibrating(false)
      alert('Microphone access denied. Please allow mic access in browser settings.')
    }
  }

  const fetchHelplines = async () => {
    if (!userLocation) return
    setLoadingHelplines(true)
    setHelplines(null)

    // Get location name first
    const addr = await reverseGeocode(userLocation.lat, userLocation.lng)
    const locationName = addr ? `${addr.city || addr.town || addr.village || ''}, ${addr.state || ''}, ${addr.country || ''}` : null

    const result = await getHelplines(userLocation.lat, userLocation.lng, locationName)
    setHelplines(result.text)
    setLoadingHelplines(false)
  }

  return (
    <div className="profile-page">
      <h1 className="mb-4">Settings</h1>

      {/* ===== VOICE DETECTION ===== */}
      <div className="glass-card mb-4">
        <div className="flex-row justify-between mb-3" style={{ alignItems: 'center' }}>
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <Mic className="text-primary" size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Scream Detection</h3>
          </div>
          <ToggleSwitch checked={audioDetectionEnabled} onChange={setAudioDetectionEnabled} />
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Listens for sudden loud sounds (screams, crashes). Auto-triggers Emergency Mode with a 5-second cancel window. Audio is never recorded — only volume levels are analyzed.
        </p>

        {audioDetectionEnabled && (
          <div>
            <div className="flex-row justify-between mb-1">
              <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Trigger Threshold</label>
              <span className="text-primary" style={{ fontWeight: 700 }}>{audioThreshold} dB</span>
            </div>
            <input type="range" min="30" max="95" value={audioThreshold} onChange={(e) => setAudioThreshold(parseInt(e.target.value))} className="range-slider" />
            <div className="flex-row justify-between" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>Very Sensitive</span><span>Less Sensitive</span>
            </div>

            <button className="btn btn-glass btn-block mt-4" onClick={startCalibration} disabled={calibrating} style={{ fontSize: '13px' }}>
              <Volume2 size={16} /> {calibrating ? '🔴 Stay quiet for 3s...' : 'Auto-Calibrate'}
            </button>

            {/* Live Audio Monitor */}
            <div className="mt-4">
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Live Monitor (test by clapping or shouting)</label>
              <AudioDetector hidden={false} />
            </div>
          </div>
        )}
      </div>

      {/* ===== CROWD SIMULATION ===== */}
      <div className="glass-card mb-4">
        <div className="flex-row gap-2 mb-3" style={{ alignItems: 'center' }}>
          <Users className="text-success" size={20} />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Community Activity</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Simulates nearby community members on the map. Adjust for demo or to see how routing changes with crowd density.
        </p>
        <div className="flex-row justify-between mb-1">
          <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>People Nearby</label>
          <span className="text-success" style={{ fontWeight: 700 }}>{crowdCount}</span>
        </div>
        <input type="range" min="0" max="100" value={crowdCount} onChange={(e) => setCrowdCount(parseInt(e.target.value))} className="range-slider range-slider-green" />
        <div className="flex-row justify-between" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>Empty</span><span>Very Crowded</span>
        </div>
        <div className="flex-row gap-2 mt-3">
          {[['🏚️ Empty', 0], ['🚶 Low', 10], ['👥 Med', 30], ['🏙️ High', 60], ['🎉 Max', 100]].map(([label, val]) => (
            <button key={val} onClick={() => setCrowdCount(val)}
              style={{ flex: 1, padding: '6px 0', borderRadius: '8px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${crowdCount === val ? 'var(--success)' : 'var(--glass-border)'}`, background: crowdCount === val ? 'rgba(46,213,115,0.15)' : 'transparent', color: crowdCount === val ? 'var(--success)' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== EMERGENCY CONTACTS ===== */}
      <div className="glass-card mb-4">
        <div className="flex-row justify-between mb-3" style={{ alignItems: 'center' }}>
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <Shield className="text-danger" size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Emergency Contacts</h3>
          </div>
          <button className="icon-btn" onClick={() => setShowAddContact(!showAddContact)} style={{ width: '32px', height: '32px' }}>
            <Plus size={16} />
          </button>
        </div>

        {showAddContact && (
          <div style={{ background: 'var(--surface-light)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
            <input className="form-input mb-2" placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
            <input className="form-input mb-2" placeholder="Phone Number" type="tel" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
            <input className="form-input mb-2" placeholder="Relationship (Mom, Friend...)" value={newContact.relationship} onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })} />
            <button className="btn btn-primary btn-block" onClick={handleAddContact} style={{ fontSize: '14px' }}>Save</button>
          </div>
        )}

        {trustedContacts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '10px', fontSize: '13px' }}>No contacts yet. Add someone you trust.</p>
        ) : (
          <div className="flex-col gap-2">
            {trustedContacts.map((c, i) => (
              <div key={i} className="flex-row justify-between" style={{ alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.phone} {c.relationship && `· ${c.relationship}`}</div>
                </div>
                <button onClick={() => handleRemoveContact(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== AI HELPLINES ===== */}
      <div className="glass-card mb-4">
        <div className="flex-row gap-2 mb-2" style={{ alignItems: 'center' }}>
          <Bot className="text-primary" size={20} />
          <h3 style={{ margin: 0, fontSize: '16px' }}>AI Local Helplines</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Uses AI to find emergency numbers for your current location/country.
        </p>
        <button className="btn btn-glass btn-block" onClick={fetchHelplines} disabled={loadingHelplines} style={{ fontSize: '13px', marginBottom: helplines ? '12px' : 0 }}>
          <MapPin size={16} /> {loadingHelplines ? 'Fetching...' : helplines ? 'Refresh Helplines' : 'Get Helplines for My Location'}
        </button>
        {helplines && (
          <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.8', padding: '8px', background: 'var(--surface-light)', borderRadius: '8px' }}>{helplines}</div>
        )}
      </div>

      {/* ===== NOTIFICATIONS ===== */}
      <div className="glass-card mb-4">
        <div className="flex-row gap-2 mb-2" style={{ alignItems: 'center' }}>
          <Bell className="text-warning" size={20} />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Notifications</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Required for check-in expiry and emergency alerts.
        </p>
        <button className="btn btn-glass btn-block" style={{ fontSize: '13px' }} onClick={() => {
          if ('Notification' in window) {
            Notification.requestPermission().then(p => {
              if (p === 'granted') alert('✅ Notifications enabled!')
              else alert('❌ Notifications blocked by browser.')
            })
          }
        }}>
          <Bell size={16} /> Enable Notifications
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .range-slider { -webkit-appearance: none; width: 100%; height: 6px; border-radius: 5px; background: var(--surface-light); outline: none; }
        .range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--primary); cursor: pointer; }
        .range-slider-green::-webkit-slider-thumb { background: var(--success); }
      `}} />
    </div>
  )
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: checked ? 'var(--primary)' : 'var(--surface-light)', transition: '.3s', borderRadius: '34px', border: '1px solid var(--glass-border)' }}>
        <span style={{ position: 'absolute', height: '20px', width: '20px', left: checked ? '24px' : '2px', bottom: '2px', background: 'white', transition: '.3s', borderRadius: '50%' }} />
      </span>
    </label>
  )
}
