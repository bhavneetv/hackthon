import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const AppContext = createContext()
const libraries = ['places']

export function AppProvider({ children }) {
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [trustedContacts, setTrustedContacts] = useState([])
  const [audioDetectionEnabled, setAudioDetectionEnabled] = useState(false)
  const [audioThreshold, setAudioThreshold] = useState(80)

  // Check-in state
  const [checkIn, setCheckIn] = useState(null) // { destination, endTime, duration }
  const checkInTimerRef = useRef(null)

  // Crowd simulation
  const [crowdCount, setCrowdCount] = useState(25) // fallback simulated crowd density

  // Google Maps
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  })

  // Load from localStorage
  useEffect(() => {
    try {
      const c = localStorage.getItem('trustedContacts')
      if (c) setTrustedContacts(JSON.parse(c))
    } catch (e) {}

    try {
      const s = localStorage.getItem('safeRouteSettings')
      if (s) {
        const p = JSON.parse(s)
        setAudioDetectionEnabled(p.audioDetectionEnabled || false)
        setAudioThreshold(p.audioThreshold || 80)
        setCrowdCount(p.crowdCount ?? 25)
      }
    } catch (e) {}

    try {
      const ci = localStorage.getItem('activeCheckIn')
      if (ci) {
        const parsed = JSON.parse(ci)
        if (parsed.endTime > Date.now()) setCheckIn(parsed)
        else localStorage.removeItem('activeCheckIn')
      }
    } catch (e) {}

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
          setLocationError(null)
        },
        () => {
          setLocationError('Location denied. Using demo location.')
          setUserLocation({ lat: 28.6139, lng: 77.2090, accuracy: 100 }) // Delhi fallback
        },
        { enableHighAccuracy: true }
      )
    } else {
      setLocationError('Geolocation not supported.')
      setUserLocation({ lat: 28.6139, lng: 77.2090, accuracy: 100 })
    }
  }, [])

  // Save settings
  useEffect(() => {
    localStorage.setItem('safeRouteSettings', JSON.stringify({
      audioDetectionEnabled, audioThreshold, crowdCount
    }))
  }, [audioDetectionEnabled, audioThreshold, crowdCount])

  // Check-in timer
  useEffect(() => {
    if (checkIn) {
      localStorage.setItem('activeCheckIn', JSON.stringify(checkIn))
      clearInterval(checkInTimerRef.current)
      checkInTimerRef.current = setInterval(() => {
        if (Date.now() >= checkIn.endTime) {
          clearInterval(checkInTimerRef.current)
          // Notify
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('SafeRoute Check-In Expired!', {
              body: `You haven't confirmed arrival at ${checkIn.destination}. Your emergency contacts will be alerted.`,
              icon: '/vite.svg'
            })
          }
          // Send SMS to first trusted contact
          if (trustedContacts.length > 0) {
            const loc = userLocation ? `${userLocation.lat},${userLocation.lng}` : 'unknown'
            const msg = `SafeRoute ALERT: ${trustedContacts[0].name}, your contact has not arrived at their destination. Last location: https://maps.google.com/?q=${loc}`
            window.open(`sms:${trustedContacts[0].phone}?body=${encodeURIComponent(msg)}`)
          }
          setCheckIn(null)
          localStorage.removeItem('activeCheckIn')
        }
      }, 1000)
    }
    return () => clearInterval(checkInTimerRef.current)
  }, [checkIn, trustedContacts, userLocation])

  const startCheckIn = (destination, minutes) => {
    setCheckIn({
      destination,
      duration: minutes,
      endTime: Date.now() + minutes * 60 * 1000,
      startTime: Date.now()
    })
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const cancelCheckIn = () => {
    setCheckIn(null)
    clearInterval(checkInTimerRef.current)
    localStorage.removeItem('activeCheckIn')
  }

  const confirmArrival = () => {
    cancelCheckIn()
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Arrived Safely!', { body: 'Check-in completed. Stay safe!' })
    }
  }

  const toggleEmergency = (status) => {
    setEmergencyMode(status !== undefined ? status : !emergencyMode)
  }

  const value = {
    userLocation, setUserLocation, locationError,
    emergencyMode, toggleEmergency,
    trustedContacts, setTrustedContacts,
    audioDetectionEnabled, setAudioDetectionEnabled,
    audioThreshold, setAudioThreshold,
    isMapLoaded, mapLoadError,
    checkIn, startCheckIn, cancelCheckIn, confirmArrival,
    crowdCount, setCrowdCount
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
