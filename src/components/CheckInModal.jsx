import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function CheckInModal({ onClose }) {
  const { startCheckIn, trustedContacts } = useApp()
  const [destination, setDestination] = useState('')
  const [minutes, setMinutes] = useState(30)

  const handleStart = () => {
    if (!destination.trim()) return
    startCheckIn(destination, minutes)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex-row justify-between mb-4" style={{ alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🕐 Safety Check-In</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <p style={{ fontSize: '13px', marginBottom: '16px' }}>
          Set a destination and timer. If you don't confirm arrival in time, your emergency contacts will be notified automatically.
        </p>

        <div className="input-group">
          <label className="input-label">Where are you going?</label>
          <input className="form-input" placeholder="e.g., Home, Office, Friend's house" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Expected arrival time</label>
          <div className="flex-row gap-2">
            {[15, 30, 45, 60, 90].map((m) => (
              <button key={m} onClick={() => setMinutes(m)}
                className={`btn ${minutes === m ? 'btn-primary' : 'btn-glass'}`}
                style={{ flex: 1, padding: '10px 0', fontSize: '14px' }}>
                {m}m
              </button>
            ))}
          </div>
        </div>

        {trustedContacts.length === 0 && (
          <div style={{ background: 'rgba(255,165,2,0.1)', border: '1px solid var(--warning)', borderRadius: '12px', padding: '10px', marginBottom: '16px', fontSize: '13px', color: 'var(--warning)' }}>
            ⚠️ Add emergency contacts in Settings to enable auto-notification.
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={handleStart} disabled={!destination.trim()}>
          <Clock size={20} />
          Start Check-In ({minutes} min)
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: flex-end; justify-content: center; }
        .modal-content { width: 100%; max-width: 600px; border-radius: 24px 24px 0 0; padding: 24px; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}} />
    </div>
  )
}
