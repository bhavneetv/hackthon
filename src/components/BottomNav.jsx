import { NavLink } from 'react-router-dom'
import { Home, Map, ShieldAlert, AlertTriangle, Settings, Shield } from 'lucide-react'
import './BottomNav.css'

export default function BottomNav() {
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

        <div className="sidebar-nav-links">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/map" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Map size={20} />
            <span>Safe Map & AI Routes</span>
          </NavLink>

          <NavLink to="/report" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={20} />
            <span>Report Incident</span>
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings & Contacts</span>
          </NavLink>
        </div>

        <div className="sidebar-emergency-card">
          <NavLink to="/emergency" className="sidebar-emergency-btn emergency-pulse">
            <ShieldAlert size={22} />
            <span>EMERGENCY MODE</span>
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <span>🛡️ SafeRoute AI v2.0 · Live</span>
        </div>
      </aside>
    </>
  )
}

