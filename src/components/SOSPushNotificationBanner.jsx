import { AlertTriangle, Navigation, Phone, ShieldAlert, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

export default function SOSPushNotificationBanner() {
  const { receivedSosPushAlert, dismissSosPushAlert } = useApp()
  const navigate = useNavigate()

  if (!receivedSosPushAlert) return null

  const handleNavigateToAlert = () => {
    if (receivedSosPushAlert.location) {
      dismissSosPushAlert()
      navigate('/map', {
        state: {
          sosLocation: receivedSosPushAlert.location,
          alertTitle: `SOS Alert (${receivedSosPushAlert.distMeters}m away)`
        }
      })
    }
  }

  const handleCallSender = () => {
    const phone = receivedSosPushAlert.senderPhone || receivedSosPushAlert.targetPhone || '112'
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`
  }

  const handleCallEmergency = () => {
    window.location.href = `tel:112`
  }

  return (
    <div className="sos-incoming-overlay">
      <div className="sos-incoming-card">
        <div className="sos-incoming-header">
          <div className="sos-incoming-pulse-icon">
            <ShieldAlert size={32} color="#ffffff" />
          </div>
          <div>
            <h3 className="sos-incoming-title">🚨 REAL-TIME SOS DETECTED!</h3>
            <p className="sos-incoming-sub">Emergency alert received from user within 100m</p>
          </div>
          <button className="sos-incoming-close" onClick={dismissSosPushAlert}>
            <X size={18} />
          </button>
        </div>

        <div className="sos-incoming-body">
          {/* Metrics Grid */}
          <div className="sos-metric-row">
            <div className="sos-metric-box">
              <span className="label">Sender Name &amp; Phone</span>
              <span className="val">{receivedSosPushAlert.senderName || 'Nearby User'}</span>
              <span className="sub-phone">📞 {receivedSosPushAlert.senderPhone || '+91 98765 43210'}</span>
            </div>
            <div className="sos-metric-box highlight">
              <span className="label">Proximity Distance</span>
              <span className="val">{receivedSosPushAlert.distMeters}m away (&lt;100m)</span>
              <span className="sub-phone">🔋 {receivedSosPushAlert.batteryPct || '85%'} · 🎯 ±{receivedSosPushAlert.gpsAccuracy || 10}m</span>
            </div>
          </div>

          <p className="sos-incoming-desc">
            Emergency SOS signal activated by <strong>{receivedSosPushAlert.senderName}</strong>. Tap below to call the sender directly or open their exact GPS location on the map.
          </p>

          <div className="flex-col gap-2 mt-3">
            <div className="flex-row gap-2">
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 700 }} onClick={handleCallSender}>
                <Phone size={16} /> Call Sender ({receivedSosPushAlert.senderPhone || 'Direct'})
              </button>
              <button className="btn btn-danger" style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 700 }} onClick={handleNavigateToAlert}>
                <Navigation size={16} /> View on Map
              </button>
            </div>
            <button className="btn btn-glass btn-block" style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }} onClick={dismissSosPushAlert}>
              Silence &amp; Dismiss Alert
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .sos-incoming-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 14, 26, 0.75);
          backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px 16px;
          animation: fadeIn 0.25s ease-out;
        }

        .sos-incoming-card {
          width: 100%;
          max-width: 440px;
          background: #192033;
          border: 2px solid #FF4757;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(255, 71, 87, 0.4);
          animation: slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .sos-incoming-header {
          background: linear-gradient(135deg, #FF4757, #C0392B);
          color: white;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }

        .sos-incoming-pulse-icon {
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: sosPulse 1s infinite;
        }

        .sos-incoming-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .sos-incoming-sub {
          margin: 2px 0 0;
          font-size: 11px;
          opacity: 0.9;
        }

        .sos-incoming-close {
          position: absolute;
          top: 12px; right: 12px;
          background: rgba(0,0,0,0.2);
          border: none;
          color: white;
          border-radius: 50%;
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }

        .sos-incoming-body {
          padding: 16px;
        }

        .sos-metric-row {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }

        .sos-metric-box {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
        }

        .sos-metric-box.highlight {
          border-color: rgba(46, 213, 115, 0.4);
          background: rgba(46, 213, 115, 0.08);
        }

        .sos-metric-box .label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .sos-metric-box .val {
          font-size: 13px;
          font-weight: 700;
          margin-top: 2px;
        }

        .sos-metric-box.highlight .val {
          color: #2ED573;
        }

        .sub-phone {
          font-size: 11px;
          color: var(--primary);
          font-weight: 600;
          margin-top: 4px;
        }

        .sos-incoming-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }
      `}} />
    </div>
  )
}

