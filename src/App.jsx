import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import MapPage from './pages/MapPage'
import EmergencyPage from './pages/EmergencyPage'
import ReportPage from './pages/ReportPage'
import ProfilePage from './pages/ProfilePage'
import AudioDetector from './components/AudioDetector'
import { useApp } from './context/AppContext'

function App() {
  const { emergencyMode, audioDetectionEnabled } = useApp()

  return (
    <BrowserRouter>
      <div className={`app-container ${emergencyMode ? 'emergency-mode-active' : ''}`}>
        {/* Global Scream / Loud Sound Detector active across ALL pages (Home, Map, Report, Emergency, Profile) */}
        {audioDetectionEnabled && <AudioDetector hidden={true} />}

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App

