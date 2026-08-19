# 🛡️ SafeRoute — AI-Powered Personal Safety Route Companion

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=google)](https://deepmind.google/technologies/gemini/)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap_%2F_Google_Maps-7EBC6F?logo=openstreetmap)](https://www.openstreetmap.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**SafeRoute** is an intelligent personal safety web application designed to help individuals make context-aware decisions while navigating urban environments. Combining real-time LLM risk reasoning, client-side geometric deviation tracking, community incident report clustering, and on-device distress audio detection, SafeRoute acts as a decision-support companion without compromising user privacy.

---

## 🌟 Key Features

### 🤖 Priority 1: AI-Enhanced Route Risk Scoring
- **LLM-Reasoned Relative Scoring**: Replaces static weighted scores with contextual risk reasoning powered by **Google Gemini 2.5 Flash** (with Groq API fallback).
- **Multi-Factor Risk Analysis**: Evaluates route geometry alongside nearby incident reports (recency, severity), lighting conditions, distance from emergency assistance (police, hospitals), community activity levels, and time of day.
- **Natural Language Explanations**: Surfaces 1-2 sentence risk justifications for candidate routes (e.g. *"Route A stays along illuminated main avenues with close proximity to the police station"*).
- **High-Performance 5-Min TTL Caching**: Keyed by route signature and environmental state to eliminate redundant API calls.
- **Strict Safety Guardrails**: All risk scores are explicitly framed as relative, approximate guidance — never presented as a guarantee of absolute safety.

### 📐 Priority 2: Geometric Route Deviation Detection
- **100% Client-Side Anomaly Tracking**: Uses perpendicular line-segment distance calculation (`minDistanceToPolylineMeters`) to track live position against planned routes with zero external API cost.
- **Non-Alarming In-App Prompt**: Detects sustained deviations (>150m for 2+ consecutive checks) and surfaces an in-app check: *"Looks like you've left your planned route — everything okay?"* with a 30-second countdown.
- **Dismissal & Escalation**: Tapping **"I'm OK — Dismiss"** resumes tracking without logging. Ignoring or confirming triggers automatic check-in emergency contact alerts.
- **Live Demo Simulator**: Built-in `🧪 Simulate Off-Route` button for testing off-route alerts without needing to walk outdoors.

### 🚨 Community Report Pattern Recognition
- **Emerging Risk Area Hotspots**: Client-side spatial clustering (`clusteringService.js`) groups incident reports by geographic proximity (300m radius) and recency (last 48 hours).
- **Dedicated Map Overlay**: Highlights emerging surges in incident density compared to historical baselines via a togglable `🚨 Emerging Hotspots` map layer.

### 🎙️ Audio & WebSpeech Distress Signal Detection
- **Web Audio API RMS Monitoring**: Measures decibel levels locally to detect sudden loud sound spikes or screams.
- **On-Device Keyword Recognition**: Integrates local browser `SpeechRecognition` to detect distress phrases (*"help"*, *"stop"*, *"police"*, *"emergency"*).
- **90-Second Cooldown Timeout**: Clicking **"I'M OK — CANCEL"** puts scream detection into a 90-second cooldown timeout to prevent re-trigger alarm loops while ambient noise remains loud.
- **Global Page Coverage**: Runs continuously in the background across all views (Home, Map, Report, Emergency, Profile).

### 🕐 Safety Check-In & One-Tap Emergency Mode
- **Check-In Timers**: Set expected arrival windows with automatic SMS / Web Push escalation to trusted contacts upon expiration.
- **One-Tap Calling**: Direct native `tel:` and `sms:` URI integration for 1-tap dialing to local police (112), ambulance (108), women's helplines, or personal contacts.
- **Dynamic Help Search**: Uses Overpass OpenStreetMap API to find nearby police stations and hospitals in real time.

---

## 🛠️ Technology Stack

| Component | Technology / Service |
|---|---|
| **Frontend Framework** | React 19, Vite 8, React Router v7 |
| **Styling & UI** | Vanilla CSS (Glassmorphism design tokens), Lucide Icons |
| **Maps & Routing** | Google Maps JS API / Directions API, OpenStreetMap Overpass API |
| **AI / LLM Engine** | Google Gemini 2.5 Flash API, Groq Cloud API (`llama-3.3-70b-versatile`) |
| **Geocoding & Places** | Nominatim (OSM), Overpass API (Free tier facilities search) |
| **Audio & Speech** | Web Audio API (`AnalyserNode`), Web Speech API (`SpeechRecognition`) |

---

## 🔒 Privacy & Safety Principles

1. **Zero Raw Audio Upload**: All audio dB measurement and WebSpeech keyword analysis occur 100% locally on-device. No audio recording or streaming leaves the client.
2. **Approximate Guidance Disclaimer**: SafeRoute is a decision-support tool, **not** a guarantee of safety or a police dispatch service.
3. **No Individual Tracking**: User location is processed locally for routing and check-in features, and community activity is anonymized into aggregate density grid cells.

---

## ⚡ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` or `yarn`

### 2. Clone & Install
```bash
git clone https://github.com/your-username/saferoute.git
cd saferoute
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
VITE_GROQ_API_KEY="your_groq_api_key"
VITE_GEMINI_API_KEY="your_gemini_api_key" # Optional (falls back to Google Maps key / Groq)
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Build for Production
```bash
npm run build
```

---

## 🎥 Hackathon Demo Guide (5 Minutes)

1. **Plan a Safe Route**:
   - Go to **Home** or **Map**, enter a destination (e.g. *"MM Hospital"* or *"Central Park"*).
   - Inspect alternative routes showing **AI Risk-Reasoned Scores (0-100)** and 1-2 sentence LLM explanations.
2. **Test Route Deviation Detection**:
   - Tap **Start Route**, then click `🧪 Simulate Off-Route`.
   - Watch the non-alarming `OffRouteModal` countdown pop up. Tap **I'm OK — Dismiss**.
3. **Explore Map Safety Layers**:
   - Toggle `🚔 Police`, `🏥 Hospital`, `⚠️ Incident Reports`, and `🚨 Emerging Hotspots`.
4. **Scream & Audio Detector**:
   - Toggle **Scream Detection** in **Settings (Profile)**.
   - Clap or shout to test dB response and WebSpeech keyword detection. Test **I'M OK — CANCEL** to observe the 90-second cooldown timeout.

---

## 📜 License & Disclaimer

Distributed under the **MIT License**.

*Disclaimer: SafeRoute is an educational prototype and hackathon MVP. It does not replace official emergency emergency services (dial 112/911 for emergencies).*
