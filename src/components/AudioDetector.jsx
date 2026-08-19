import { useEffect, useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Mic, MicOff, AlertCircle } from 'lucide-react'

export default function AudioDetector({ hidden = false, onTrigger }) {
  const { audioThreshold, toggleEmergency } = useApp()
  const [dbLevel, setDbLevel] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [triggered, setTriggered] = useState(false)
  const [cancelCountdown, setCancelCountdown] = useState(5)

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const micRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const cancelTimerRef = useRef(null)
  const baselineRef = useRef(30)
  const spikeCountRef = useRef(0)
  const triggeredRef = useRef(false)

  const [distressPhrase, setDistressPhrase] = useState(null)
  const [cooldownSec, setCooldownSec] = useState(0)
  const recognitionRef = useRef(null)
  const cooldownEndRef = useRef(0)
  const cooldownTimerRef = useRef(null)

  useEffect(() => {
    startListening()
    return () => stopListening()
  }, [])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.3
      analyserRef.current = analyser

      const mic = ctx.createMediaStreamSource(stream)
      mic.connect(analyser)
      micRef.current = mic

      setIsListening(true)

      // Initialize Web Speech API for on-device local keyword detection
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event) => {
          // Ignore triggers if in cooldown timeout period
          if (Date.now() < cooldownEndRef.current) return

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase()
            const distressKeywords = ['help', 'stop', 'police', 'save me', 'emergency', 'let me go', 'fire']
            const matched = distressKeywords.find(kw => transcript.includes(kw))
            if (matched) {
              setDistressPhrase(matched)
              if (dbLevel > audioThreshold - 15 && !triggeredRef.current) {
                handleTrigger(matched)
              }
            }
          }
        }
        try { recognition.start() } catch (e) {}
        recognitionRef.current = recognition
      }

      const dataArray = new Float32Array(analyser.fftSize)

      const checkLevel = () => {
        if (!analyserRef.current) return

        analyserRef.current.getFloatTimeDomainData(dataArray)

        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)

        const db = Math.max(0, Math.min(100, Math.round(20 * Math.log10(rms + 0.0001) + 100)))
        setDbLevel(db)

        baselineRef.current = baselineRef.current * 0.995 + db * 0.005

        // Ignore triggers if in 1.5 min cooldown timeout period
        if (Date.now() >= cooldownEndRef.current) {
          const spike = db - baselineRef.current
          if (db > audioThreshold && spike > 12) {
            spikeCountRef.current++
            if (spikeCountRef.current >= 2 && !triggeredRef.current) {
              handleTrigger()
            }
          } else {
            spikeCountRef.current = Math.max(0, spikeCountRef.current - 1)
          }
        }

        animFrameRef.current = requestAnimationFrame(checkLevel)
      }

      checkLevel()
    } catch (err) {
      console.error('Mic access denied:', err)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (micRef.current) micRef.current.disconnect()
    if (audioContextRef.current) audioContextRef.current.close()
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current)
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
    }
    setIsListening(false)
  }

  const handleTrigger = (keyword = null) => {
    // Check if in 90-second cooldown timeout
    if (Date.now() < cooldownEndRef.current) return

    triggeredRef.current = true
    setTriggered(true)
    const initialCountdown = keyword ? 2 : 5
    setCancelCountdown(initialCountdown)

    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current)

    let current = initialCountdown
    cancelTimerRef.current = setInterval(() => {
      current -= 1
      setCancelCountdown(current)

      if (current <= 0) {
        clearInterval(cancelTimerRef.current)
        toggleEmergency(true)
        if (onTrigger) onTrigger()
        window.location.href = 'tel:112'
        setTriggered(false)
        triggeredRef.current = false
      }
    }, 1000)
  }

  const handleCancel = () => {
    if (cancelTimerRef.current) clearInterval(cancelTimerRef.current)
    triggeredRef.current = false
    setTriggered(false)
    setDistressPhrase(null)
    setCancelCountdown(5)
    spikeCountRef.current = 0
    baselineRef.current = dbLevel

    // ADD 90-SECOND (1.5 MINUTE) COOLDOWN TIMEOUT
    const cooldownMs = 90 * 1000 // 90 seconds timeout
    cooldownEndRef.current = Date.now() + cooldownMs
    setCooldownSec(90)

    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    cooldownTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownEndRef.current - Date.now()) / 1000))
      setCooldownSec(remaining)
      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current)
      }
    }, 1000)
  }

  const barWidth = Math.min(100, dbLevel)
  const barColor = dbLevel > audioThreshold ? '#FF4757' : dbLevel > audioThreshold - 20 ? '#FFA502' : '#2ED573'

  return (
    <>
      {/* Full screen Emergency Countdown Modal when triggered */}
      {triggered && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          background: 'rgba(15, 15, 26, 0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'screamPulse 0.6s infinite alternate' }}>
            🚨
          </div>
          <h2 style={{ color: '#FF4757', fontSize: '24px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
            {distressPhrase ? `DISTRESS WORD DETECTED ("${distressPhrase.toUpperCase()}")` : 'LOUD SOUND DETECTED!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', maxWidth: '320px' }}>
            Calling Emergency Police (112) in:
          </p>

          <div style={{
            fontSize: '96px',
            fontWeight: 900,
            color: '#FF4757',
            lineHeight: 1,
            marginBottom: '32px',
            textShadow: '0 0 30px rgba(255, 71, 87, 0.6)'
          }}>
            {cancelCountdown}s
          </div>

          <button
            onClick={handleCancel}
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: '18px 24px',
              fontSize: '20px',
              fontWeight: 700,
              background: '#2ED573',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(46, 213, 115, 0.4)'
            }}
          >
            I'M OK — CANCEL
          </button>
        </div>
      )}

      {/* Embedded dB Monitor */}
      {!hidden && !triggered && (
        <div className="glass-card" style={{ padding: '12px' }}>
          <div className="flex-row justify-between mb-2" style={{ alignItems: 'center' }}>
            <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
              {isListening ? <Mic size={16} color={cooldownSec > 0 ? '#FFA502' : '#2ED573'} /> : <MicOff size={16} color="#FF4757" />}
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                {cooldownSec > 0 ? `⏸️ Cooldown paused (${cooldownSec}s)` : isListening ? 'Listening (AI WebSpeech active)...' : 'Mic off'}
              </span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: barColor }}>{dbLevel} dB</span>
          </div>
          <div style={{ height: '8px', background: 'var(--surface-light)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${barWidth}%`, background: barColor, borderRadius: '4px', transition: 'width 0.1s' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${audioThreshold}%`, width: '2px', background: '#FF4757' }} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
            Threshold: {audioThreshold} dB {cooldownSec > 0 ? `· ⏸️ Cooldown active (${cooldownSec}s)` : distressPhrase ? `· Detected: "${distressPhrase}"` : ''}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes screamPulse {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
      `}} />
    </>
  )
}


