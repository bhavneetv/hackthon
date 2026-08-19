import { NavLink } from 'react-router-dom'
import { Home, Map, ShieldAlert, AlertTriangle, Settings, Shield, User, Phone } from 'lucide-react'
import { useApp } from '../context/AppContext'
import './BottomNav.css'

export default function BottomNav() {
  const { userName, userPhone, sosActive, triggerSOS } = useApp()

  return (
    <>
      {/* Mobile Bottom Navigation (< 768px) */}
      <nav className="bottom-nav mobile-only-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Map size={24} />
          <span>Map</span>
        </NavLink>

        <div className="nav-item-emergency">
          <NavLink to="/emergency" className={({ isActive }) => `emergency-fab ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={32} />
          </NavLink>
        </div>

        <NavLink to="/report" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <AlertTriangle size={24} />
          <span>Report</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* PC / Desktop Left Sidebar (> 768px) */}
      <aside className="pc-sidebar desktop-only-nav">
        <div className="sidebar-brand">
          <Shield size={32} className="text-primary" />
          <div className="brand-text">
            <h2>SafeRoute</h2>
            <span className="brand-badge">AI Safety Companion</span>
          </div>
        </div>

        {/* User Quick Profile Info */}
        <div className="sidebar-user-card">
          <div className="flex-row gap-2 align-center">
            <div className="sidebar-user-avatar">
              <User size={18} />
            </div>
            <div>
              <div className="sidebar-user-name">{userName || 'Safe User'}</div>
              <div className="sidebar-user-phone">
                <Phone size={11} /> {userPhone || '+91 98765 43210'}
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-nav-links">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/map" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Map size={20} />
            <span>Safe Map &amp; AI Routes</span>
          </NavLink>

          <NavLink to="/report" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={20} />
            <span>Report Incident</span>
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings &amp; Profile</span>
          </NavLink>
        </div>

        <div className="sidebar-emergency-card">
          <button className={`sidebar-emergency-btn ${sosActive ? 'active-sos-btn' : 'emergency-pulse'}`} onClick={() => triggerSOS()}>
            <ShieldAlert size={22} />
            <span>{sosActive ? '🚨 SOS ACTIVE' : 'TRIGGER SOS'}</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <span>🛡️ SafeRoute AI v2.0 · Live</span>
        </div>
      </aside>
    </>
  )
}

