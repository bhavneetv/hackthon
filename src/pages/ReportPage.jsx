import { useState } from 'react'
import { AlertTriangle, MapPin, CheckCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ReportPage() {
  const { userLocation } = useApp()
  const [type, setType] = useState('Unsafe Area')
  const [desc, setDesc] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    const report = {
      type,
      desc,
      lat: userLocation ? userLocation.lat : 51.505, // Default fallback
      lng: userLocation ? userLocation.lng : -0.09,
      time: new Date().toISOString()
    }
    
    const existing = localStorage.getItem('safeRouteReports')
    const reports = existing ? JSON.parse(existing) : []
    reports.push(report)
    localStorage.setItem('safeRouteReports', JSON.stringify(reports))
    
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setDesc('')
    }, 3000)
  }

  return (
    <div className="report-page">
      <h1 className="mb-4">Report an Issue</h1>
      
      <div className="glass-card">
        {submitted ? (
          <div className="flex-col align-center justify-center p-4 text-center">
            <CheckCircle size={48} className="text-success mb-2" />
            <h3>Report Submitted</h3>
            <p>Thank you for keeping the community safe.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="input-label">Issue Type</label>
              <select 
                className="form-input" 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                style={{ appearance: 'none' }}
              >
                <option>Unsafe Area</option>
                <option>Poor Lighting</option>
                <option>Suspicious Activity</option>
                <option>Road Hazard</option>
                <option>Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="input-label">Location</label>
              <div className="form-input flex-row gap-2" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={18} />
                {userLocation ? 'Current Location (Auto-detected)' : 'Location not available'}
              </div>
            </div>

            <div className="mb-4">
              <label className="input-label">Description (Optional)</label>
              <textarea 
                className="form-input" 
                rows="4" 
                placeholder="Provide more details..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <button className="btn btn-primary btn-block" onClick={handleSubmit}>
              <AlertTriangle size={20} />
              Submit Report
            </button>
          </>
        )}
      </div>
    </div>
  )
}
