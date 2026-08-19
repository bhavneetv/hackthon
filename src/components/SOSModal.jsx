import { useState, useEffect } from 'react'
import { AlertTriangle, Phone, Send, Radio, CheckCircle, XCircle, ShieldAlert, Users, Bell, Volume2, VolumeX, Lock, Battery, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function SOSModal({ onClose }) {
  const { sosData, cancelSOS, userLocation, triggerSOS, userName, userPhone, sosPin, sirenEnabled, setSirenEnabled, playSiren, stopSiren } = useApp()
  const [countdown, setCountdown] = useState(3)
  const [isCountingDown, setIsCountingDown] = useState(!sosData)
  const [scanning, setScanning] = useState(true)
  const [showPinModal, setShowPinModal] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    let timer
    if (isCountingDown && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    } else if (isCountingDown && countdown === 0) {
      setIsCountingDown(false)
      triggerSOS()
    }
    return () => clearInterval(timer)
  }, [isCountingDown, countdown, triggerSOS])

  useEffect(() => {
    const scanTimer = setTimeout(() => {
      setScanning(false)
    }, 1500)
    return () => clearTimeout(scanTimer)
  }, [])

  const handleManualSMS = () => {
    if (!sosData) return
    window.location.href = `sms:${sosData.targetPhone}?body=${encodeURIComponent(sosData.smsMessage)}`
  }

  const handleCallEmergency = () => {
    const phone = sosData?.targetPhone || '112'
    window.location.href = `tel:${phone}`
  }

  const handleAttemptCancel = () => {
    if (sosPin) {
      setShowPinModal(true)
      setEnteredPin('')
      setPinError('')
    } else {
      cancelSOS()
    }
  }

  const handleVerifyPin = () => {
    if (enteredPin === sosPin || enteredPin === '1234') {
      setShowPinModal(false)
      cancelSOS()
    } else {
      setPinError('Invalid PIN! Default is 1234.')
    }
  }

  const notifiedWithin100m = sosData?.notifiedUsers || []
  const allNearby = sosData?.allNearbyUsers || []

  return (
    <div className="sos-modal-overlay">
      <div className="sos-modal-card">
        {/* Header Header with Visual Panic Strobe Effect */}
        <div className="sos-header sos-strobe-header">
          <div className="flex-row justify-between align-center mb-1">
            <button className="btn-siren-toggle" onClick={() => {
              if (sirenEnabled) { setSirenEnabled(false); stopSiren() }
              else { setSirenEnabled(true); playSiren() }
            }} title="Toggle Siren Sound">
              {sirenEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{sirenEnabled ? 'Siren On' : 'Muted'}</span>
            </button>
            <span className="badge-strobe">STROBE ACTIVE</span>
          </div>

          <div className="sos-icon-pulse">
            <ShieldAlert size={36} color="#ffffff" />
          </div>
          <h2>EMERGENCY SOS ALERT</h2>
          <p className="sos-subtitle">
            {isCountingDown ? `Broadcasting in ${countdown}s...` : `Broadcasting for ${userName} (${userPhone})`}
          </p>
        </div>

        {/* Countdown view before trigger */}
        {isCountingDown ? (
          <div className="countdown-body">
            <div className="countdown-circle">
              <span>{countdown}</span>
            </div>
            <p className="countdown-warning">
              Sending emergency SMS &amp; broadcasting instant push notifications to all users within <strong>100 meters</strong>!
            </p>
            <div className="flex-row gap-2 mt-3" style={{ width: '100%' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '14px', background: '#FF4757' }} onClick={() => { setIsCountingDown(false); triggerSOS() }}>
                🚨 Send NOW
              </button>
              <button className="btn btn-glass" style={{ flex: 1, padding: '14px' }} onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="sos-content">
            {/* User & Battery/GPS Live Metrics Bar */}
            <div className="sos-user-metrics-card mb-3">
              <div className="flex-row justify-between align-center">
                <div>
                  <div className="user-sender-name">{sosData?.senderName || userName}</div>
                  <div className="user-sender-phone">📞 {sosData?.senderPhone || userPhone}</div>
                </div>
                <div className="metrics-pills flex-row gap-2">
                  <span className="metric-tag"><Battery size={12} /> {sosData?.batteryPct || '85%'}</span>
                  <span className="metric-tag"><Zap size={12} /> ±{sosData?.gpsAccuracy || 10}m GPS</span>
                </div>
              </div>
            </div>

            {/* Status Radar Banner */}
            <div className="radar-status-card">
              <div className="flex-row justify-between align-center mb-2">
                <div className="flex-row gap-2 align-center">
                  <Radio size={18} className="radar-spin text-danger" />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>100m Proximity Scanner</span>
                </div>
                <span className="badge badge-danger">
                  {scanning ? 'Scanning Radius...' : `${notifiedWithin100m.length} User(s) Notified`}
                </span>
              </div>
              <div className="radar-animation-container">
                <div className="radar-sweep"></div>
                <div className="radar-center-dot"></div>
                {allNearby.map((u, i) => (
                  <div
                    key={u.id}
                    className={`radar-user-dot ${u.isWithin100m ? 'within-range' : 'out-range'}`}
                    style={{
                      top: `${50 + (i === 0 ? -20 : i === 1 ? 18 : i === 2 ? -30 : 38)}%`,
                      left: `${50 + (i === 0 ? 25 : i === 1 ? -22 : i === 2 ? -35 : 35)}%`
                    }}
                    title={`${u.name} (${u.distMeters}m)`}
                  />
                ))}
              </div>
            </div>

            {/* Status Checklist */}
            <div className="status-checklist mb-3">
              <div className="status-item">
                <div className="status-icon success"><CheckCircle size={16} /></div>
                <div className="status-text">
                  <span className="title">SMS Emergency Dispatch</span>
                  <span className="sub">Sent to target: <strong>{sosData?.targetPhone || '112'}</strong></span>
                </div>
                <button className="btn-small-link" onClick={handleManualSMS}>Resend SMS</button>
              </div>

              <div className="status-item">
                <div className="status-icon success"><Bell size={16} /></div>
                <div className="status-text">
                  <span className="title">100m Push Notification</span>
                  <span className="sub">Alerted {notifiedWithin100m.length} user(s) strictly under 100 meters</span>
                </div>
                <span className="badge-pill">ACTIVE</span>
              </div>
            </div>

            {/* List of Nearby Users (<100m Filtered) */}
            <div className="nearby-responders-section mb-3">
              <div className="flex-row justify-between align-center mb-2">
                <h4 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> Nearby Community Responders
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Radius: 100m</span>
              </div>

              <div className="responders-list">
                {allNearby.map(user => (
                  <div key={user.id} className={`responder-card ${user.isWithin100m ? 'in-range' : 'muted-range'}`}>
                    <div className="flex-row gap-2 align-center">
                      <span className="user-avatar">{user.avatar}</span>
                      <div>
                        <div className="user-name">{user.name}</div>
                        <div className="user-dist">
                          📍 {user.distMeters}m away
                          {user.isWithin100m ? (
                            <span className="tag-in-100m">Push Sent (&lt;100m)</span>
                          ) : (
                            <span className="tag-out-100m">Outside 100m</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {user.isWithin100m && (
                      <a href={`tel:${user.phone}`} className="btn-call-peer">
                        <Phone size={14} /> Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PIN Verification Sub-Modal */}
            {showPinModal ? (
              <div className="pin-verify-card mb-3">
                <div className="flex-row gap-2 align-center mb-2">
                  <Lock size={18} className="text-warning" />
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Safety Cancellation PIN</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                  Enter your 4-digit PIN to confirm cancellation (Default: <strong>1234</strong>)
                </p>
                <input
                  type="password"
                  maxLength={4}
                  className="form-input mb-2"
                  placeholder="Enter 4-digit PIN"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                  autoFocus
                />
                {pinError && <p style={{ fontSize: '11px', color: '#FF4757', margin: '0 0 8px' }}>{pinError}</p>}
                <div className="flex-row gap-2">
                  <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={handleVerifyPin}>Confirm PIN</button>
                  <button className="btn btn-glass" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => setShowPinModal(false)}>Back</button>
                </div>
              </div>
            ) : (
              /* Quick Actions */
              <div className="flex-col gap-2">
                <button className="btn btn-danger btn-block panic-btn-pulse" style={{ padding: '14px', fontSize: '16px', fontWeight: 700 }} onClick={handleCallEmergency}>
                  <Phone size={20} /> CALL EMERGENCY DIALER ({sosData?.targetPhone || '112'})
                </button>
                <button className="btn btn-glass btn-block" style={{ padding: '12px', color: 'var(--text-muted)' }} onClick={handleAttemptCancel}>
                  <XCircle size={18} /> Clear &amp; Stop SOS Alert (PIN Required)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .sos-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 14, 26, 0.88);
          backdrop-filter: blur(10px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease-out;
        }

        .sos-modal-card {
          width: 100%;
          max-width: 440px;
          background: #141B2D;
          border: 1px solid rgba(255, 71, 87, 0.4);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(255, 71, 87, 0.3);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }

        .sos-header {
          background: linear-gradient(135deg, #FF4757, #C0392B);
          padding: 20px;
          text-align: center;
          color: white;
          position: relative;
        }

        .sos-strobe-header {
          animation: strobeFlash 1s infinite alternate;
        }

        @keyframes strobeFlash {
          0% { background: linear-gradient(135deg, #FF4757, #C0392B); }
          100% { background: linear-gradient(135deg, #E8414F, #8E44AD); }
        }

        .btn-siren-toggle {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .badge-strobe {
          font-size: 9px;
          background: rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .sos-user-metrics-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 10px 14px;
        }

        .user-sender-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
        }

        .user-sender-phone {
          font-size: 11px;
          color: var(--primary);
          font-weight: 600;
        }

        .metric-tag {
          font-size: 10px;
          background: rgba(255, 71, 87, 0.15);
          color: #FF4757;
          padding: 3px 8px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .pin-verify-card {
          background: rgba(255, 165, 2, 0.08);
          border: 1px solid rgba(255, 165, 2, 0.3);
          border-radius: 14px;
          padding: 14px;
        }

        .sos-icon-pulse {
          width: 56px;
          height: 56px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          animation: sosPulse 1.2s infinite;
        }

        .sos-header h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: 1.5px;
          font-weight: 800;
        }

        .sos-subtitle {
          margin: 4px 0 0;
          font-size: 12px;
          opacity: 0.9;
        }

        .countdown-body {
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .countdown-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid #FF4757;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: 800;
          color: #FF4757;
          margin-bottom: 16px;
          animation: ping 1s infinite;
        }

        .countdown-warning {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .sos-content {
          padding: 16px;
          overflow-y: auto;
        }

        .radar-status-card {
          background: rgba(255, 71, 87, 0.08);
          border: 1px solid rgba(255, 71, 87, 0.2);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .badge-danger {
          background: #FF4757;
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .radar-animation-container {
          position: relative;
          height: 100px;
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          border: 1px dashed rgba(255,71,87,0.3);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .radar-sweep {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 1px solid rgba(255,71,87,0.4);
          animation: radarScan 2.5s linear infinite;
        }

        .radar-center-dot {
          width: 10px;
          height: 10px;
          background: #FF4757;
          border-radius: 50%;
          box-shadow: 0 0 10px #FF4757;
          z-index: 2;
        }

        .radar-user-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          z-index: 3;
        }

        .radar-user-dot.within-range {
          background: #2ED573;
          box-shadow: 0 0 8px #2ED573;
          animation: blink 1s infinite;
        }

        .radar-user-dot.out-range {
          background: #747D8C;
          opacity: 0.5;
        }

        .status-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.03);
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
        }

        .status-icon.success {
          color: #2ED573;
        }

        .status-text {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .status-text .title {
          font-size: 13px;
          font-weight: 600;
        }

        .status-text .sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .btn-small-link {
          background: rgba(46, 213, 115, 0.15);
          color: #2ED573;
          border: none;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 600;
        }

        .badge-pill {
          font-size: 10px;
          background: rgba(46, 213, 115, 0.2);
          color: #2ED573;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .responders-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 150px;
          overflow-y: auto;
        }

        .responder-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 12px;
          background: var(--surface-light);
          border: 1px solid var(--glass-border);
        }

        .responder-card.in-range {
          border-color: rgba(46, 213, 115, 0.4);
          background: rgba(46, 213, 115, 0.05);
        }

        .user-avatar { font-size: 18px; }
        .user-name { font-size: 13px; font-weight: 600; }
        .user-dist { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }

        .tag-in-100m {
          color: #2ED573;
          font-weight: 600;
          font-size: 10px;
          background: rgba(46, 213, 115, 0.15);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .tag-out-100m {
          color: var(--text-muted);
          font-size: 10px;
        }

        .btn-call-peer {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--primary);
          color: white;
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        @keyframes sosPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }

        @keyframes radarScan {
          0% { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .panic-btn-pulse {
          animation: sosPulse 2s infinite;
        }
      `}} />
    </div>
  )
}
