import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import { haversineDistance } from '../services/placesService'

const AppContext = createContext()
const libraries = ['places']

export function AppProvider({ children }) {
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [trustedContacts, setTrustedContacts] = useState([])
  const [audioDetectionEnabled, setAudioDetectionEnabled] = useState(false)
  const [audioThreshold, setAudioThreshold] = useState(80)

  // User Profile Settings
  const [userName, setUserName] = useState('Priya Sharma')
  const [userPhone, setUserPhone] = useState('+91 98765 43210')
  const [sosPin, setSosPin] = useState('1234')
  const [sirenEnabled, setSirenEnabled] = useState(true)

  // Siren Audio Ref
  const audioCtxRef = useRef(null)
  const sirenOscRef = useRef(null)

  // Check-in state
  const [checkIn, setCheckIn] = useState(null) // { destination, endTime, duration }
  const checkInTimerRef = useRef(null)

  // Crowd simulation
  const [crowdCount, setCrowdCount] = useState(25) // fallback simulated crowd density

  // Unique Tab Session ID for distinguishing real users across open tabs/windows
  const tabIdRef = useRef('User-' + Math.floor(1000 + Math.random() * 9000))

  // SOS Emergency & Proximity Notifications State
  const [sosActive, setSosActive] = useState(false)
  const [sosData, setSosData] = useState(null)
  const [showSosModal, setShowSosModal] = useState(false)
  const [receivedSosPushAlert, setReceivedSosPushAlert] = useState(null)

  // Nearby Community Users (Simulated active app users relative to user location)
  const [nearbyCommunityUsers, setNearbyCommunityUsers] = useState([])

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
      const pName = localStorage.getItem('userName')
      if (pName) setUserName(pName)
      const pPhone = localStorage.getItem('userPhone')
      if (pPhone) setUserPhone(pPhone)
      const pPin = localStorage.getItem('sosPin')
      if (pPin) setSosPin(pPin)
    } catch (e) {}

    try {
      const s = localStorage.getItem('safeRouteSettings')
      if (s) {
        const p = JSON.parse(s)
        setAudioDetectionEnabled(p.audioDetectionEnabled || false)
        setAudioThreshold(p.audioThreshold || 80)
        setCrowdCount(p.crowdCount ?? 25)
        setSirenEnabled(p.sirenEnabled ?? true)
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

  // Audio Siren Generator using Web Audio API
  const playSiren = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      if (sirenOscRef.current) return // Already playing

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(500, ctx.currentTime)

      let freqUp = true
      const interval = setInterval(() => {
        if (!sirenOscRef.current) { clearInterval(interval); return }
        try {
          osc.frequency.linearRampToValueAtTime(freqUp ? 950 : 500, ctx.currentTime + 0.35)
          freqUp = !freqUp
        } catch (e) {}
      }, 400)

      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      sirenOscRef.current = osc
    } catch (e) {
      console.warn('Audio Siren Error:', e)
    }
  }

  const stopSiren = () => {
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop()
        sirenOscRef.current.disconnect()
      } catch (e) {}
      sirenOscRef.current = null
    }
  }

  // Generate simulated nearby community users centered around current user position
  useEffect(() => {
    if (!userLocation) return
    const lat = userLocation.lat
    const lng = userLocation.lng

    // Offsets roughly in meters (~0.00001 lat is ~1.1 meters)
    const mockUsers = [
      { id: 'usr-1', name: 'Aarav Sharma', lat: lat + 0.0003, lng: lng + 0.0002, avatar: '👨‍💼', phone: '+91 98765 43210' }, // ~40m away (<100m)
      { id: 'usr-2', name: 'Priya Patel', lat: lat - 0.0005, lng: lng + 0.0004, avatar: '👩‍⚕️', phone: '+91 98765 12345' },  // ~75m away (<100m)
      { id: 'usr-3', name: 'Ananya Gupta', lat: lat + 0.0007, lng: lng - 0.0005, avatar: '👩‍🏫', phone: '+91 98123 45678' }, // ~95m away (<100m)
      { id: 'usr-4', name: 'Vikram Singh', lat: lat + 0.0020, lng: lng + 0.0018, avatar: '👮‍♂️', phone: '+91 98999 88877' }  // ~270m away (>100m)
    ].map(u => {
      const distKm = haversineDistance(lat, lng, u.lat, u.lng)
      const distMeters = Math.round(distKm * 1000)
      return { ...u, distMeters, isWithin100m: distMeters <= 100 }
    })

    setNearbyCommunityUsers(mockUsers)
  }, [userLocation])

  // Process incoming SOS payload from another tab or device
  const processIncomingSosAlert = (data) => {
    if (!data || data.senderId === tabIdRef.current) return // Ignore self tab broadcasts

    const { senderName, senderPhone, batteryPct, gpsAccuracy, senderLoc, targetPhone, timestamp } = data
    let distMeters = 15 // Default close proximity for same machine tab testing
    if (userLocation && senderLoc) {
      const computed = Math.round(haversineDistance(userLocation.lat, userLocation.lng, senderLoc.lat, senderLoc.lng) * 1000)
      if (computed > 0) distMeters = computed
    }

    // Only alert if within 100 meters
    if (distMeters <= 100) {
      setReceivedSosPushAlert({
        senderName: senderName || 'Nearby SafeRoute User',
        senderPhone: senderPhone || '+91 98765 43210',
        batteryPct: batteryPct || '85%',
        gpsAccuracy: gpsAccuracy || 10,
        distMeters,
        location: senderLoc,
        targetPhone: targetPhone || '112',
        timestamp: timestamp || Date.now()
      })

      if (sirenEnabled) {
        playSiren()
      }

      // Native Web Notification API trigger
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 REAL-TIME SOS DETECTED NEARBY!', {
          body: `Emergency SOS from ${senderName || 'Nearby User'} (${senderPhone || '+91 98765 43210'}) — ${distMeters}m away!`,
          icon: '/vite.svg',
          requireInteraction: true
        })
      }
    }
  }

  // Ref for Public Cloud WebSocket connection (for Production & Public URLs)
  const cloudWsRef = useRef(null)

  // Setup BroadcastChannel, Vite WebSocket, Cloud WebSocket & localStorage listeners
  useEffect(() => {
    // 1. BroadcastChannel Listener
    let sosChannel
    if (typeof BroadcastChannel !== 'undefined') {
      sosChannel = new BroadcastChannel('saferoute_sos_channel')
      sosChannel.onmessage = (event) => {
        if (event.data?.type === 'SOS_TRIGGERED') {
          processIncomingSosAlert(event.data)
        }
      }
    }

    // 2. Storage Event Listener (works across tabs & windows)
    const handleStorageChange = (e) => {
      if (e.key === 'saferoute_live_sos_alert' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          processIncomingSosAlert(parsed)
        } catch (err) {}
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // 3. Vite Server WebSocket Listener (PC <-> Mobile / Network Devices in Dev Mode)
    if (import.meta.hot) {
      import.meta.hot.on('saferoute:sos_broadcast', (data) => {
        processIncomingSosAlert(data)
      })
    }

    // 4. Public Cloud WebSocket Relay (for Public Netlify / Vercel / Hosted URLs)
    try {
      const cloudWs = new WebSocket('wss://socketsbay.com/wss/v2/1/demo/')
      cloudWsRef.current = cloudWs
      cloudWs.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed?.type === 'SOS_TRIGGERED') {
            processIncomingSosAlert(parsed)
          }
        } catch (err) {}
      }
    } catch (e) {
      console.warn('Cloud WebSocket connection error:', e)
    }

    return () => {
      if (sosChannel) sosChannel.close()
      window.removeEventListener('storage', handleStorageChange)
      if (cloudWsRef.current && cloudWsRef.current.readyState === WebSocket.OPEN) {
        cloudWsRef.current.close()
      }
    }
  }, [userLocation])

  // Save settings
  useEffect(() => {
    localStorage.setItem('safeRouteSettings', JSON.stringify({
      audioDetectionEnabled, audioThreshold, crowdCount, sirenEnabled
    }))
    localStorage.setItem('userName', userName)
    localStorage.setItem('userPhone', userPhone)
    localStorage.setItem('sosPin', sosPin)
  }, [audioDetectionEnabled, audioThreshold, crowdCount, sirenEnabled, userName, userPhone, sosPin])

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

  // SOS Trigger Handler
  const triggerSOS = async (targetPhoneOverride) => {
    // Request push notification permissions if default
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const primaryContact = trustedContacts.length > 0 ? trustedContacts[0].phone : '112'
    const phone = targetPhoneOverride || primaryContact
    const locString = userLocation ? `${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}` : '28.6139,77.2090'
    const mapUrl = `https://maps.google.com/?q=${locString}`
    const smsMessage = `🚨 EMERGENCY SOS ALERT! I need immediate assistance! Sender: ${userName} (${userPhone}). My Live Location: ${mapUrl}`

    // Battery level check
    let batteryPct = '88%'
    if (navigator.getBattery) {
      try {
        const batt = await navigator.getBattery()
        batteryPct = `${Math.round(batt.level * 100)}%`
      } catch (e) {}
    }

    const gpsAccuracy = Math.round(userLocation?.accuracy || 12)

    // Calculate users within 100m
    const usersWithin100m = nearbyCommunityUsers.filter(u => u.distMeters <= 100)

    const payload = {
      timestamp: Date.now(),
      senderId: tabIdRef.current,
      senderName: userName,
      senderPhone: userPhone,
      batteryPct,
      gpsAccuracy,
      location: userLocation || { lat: 28.6139, lng: 77.2090 },
      targetPhone: phone,
      smsMessage,
      notifiedUsers: usersWithin100m,
      allNearbyUsers: nearbyCommunityUsers
    }

    setSosActive(true)
    setEmergencyMode(true)
    setSosData(payload)
    setShowSosModal(true)

    if (sirenEnabled) {
      playSiren()
    }

    const sosBroadcastData = {
      type: 'SOS_TRIGGERED',
      senderId: tabIdRef.current,
      senderName: userName,
      senderPhone: userPhone,
      batteryPct,
      gpsAccuracy,
      senderLoc: userLocation || { lat: 28.6139, lng: 77.2090 },
      targetPhone: phone,
      timestamp: Date.now()
    }

    // 1. Broadcast to PC & Mobile over network via Vite WebSocket
    if (import.meta.hot) {
      try {
        import.meta.hot.send('saferoute:sos_alert', sosBroadcastData)
      } catch (e) {
        console.warn('Vite WebSocket send error:', e)
      }
    }

    // 2. Broadcast over Public Cloud WebSocket (Public URLs / Production / Netlify / Vercel)
    if (cloudWsRef.current && cloudWsRef.current.readyState === WebSocket.OPEN) {
      try {
        cloudWsRef.current.send(JSON.stringify(sosBroadcastData))
      } catch (e) {
        console.warn('Cloud WebSocket send error:', e)
      }
    }

    // 3. Broadcast across tabs/windows via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const sosChannel = new BroadcastChannel('saferoute_sos_channel')
        sosChannel.postMessage(sosBroadcastData)
        sosChannel.close()
      } catch (e) {
        console.warn('BroadcastChannel error:', e)
      }
    }

    // 4. Write to localStorage for cross-tab storage events
    try {
      localStorage.setItem('saferoute_live_sos_alert', JSON.stringify({
        ...sosBroadcastData,
        _nonce: Math.random()
      }))
    } catch (err) {}

    // Trigger local push notification for current user device feedback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 SOS ALERT ACTIVATED', {
        body: `Emergency SMS sent to ${phone}. Push notification sent to ${usersWithin100m.length} user(s) within 100m radius!`,
        icon: '/vite.svg'
      })
    }

    // Trigger SMS protocol launch
    try {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(smsMessage)}`
    } catch (err) {
      console.warn('SMS URI launch:', err)
    }
  }

  const cancelSOS = () => {
    stopSiren()
    setSosActive(false)
    setSosData(null)
    setShowSosModal(false)
  }

  const dismissSosPushAlert = () => {
    stopSiren()
    setReceivedSosPushAlert(null)
  }

  const value = {
    userLocation, setUserLocation, locationError,
    emergencyMode, toggleEmergency,
    trustedContacts, setTrustedContacts,
    audioDetectionEnabled, setAudioDetectionEnabled,
    audioThreshold, setAudioThreshold,
    isMapLoaded, mapLoadError,
    checkIn, startCheckIn, cancelCheckIn, confirmArrival,
    crowdCount, setCrowdCount,
    // SOS & User Profile State
    userName, setUserName,
    userPhone, setUserPhone,
    sosPin, setSosPin,
    sirenEnabled, setSirenEnabled,
    playSiren, stopSiren,
    sosActive, sosData, showSosModal, setShowSosModal,
    triggerSOS, cancelSOS,
    nearbyCommunityUsers,
    receivedSosPushAlert, dismissSosPushAlert
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)


