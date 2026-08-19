# 🛡️ SafeRoute — AI-Powered Personal Safety Route Companion

[![Live Demo](https://img.shields.io/badge/Netlify-Live%20Demo-00C7B7?logo=netlify)](https://gyan-jyoti-demo1.netlify.app)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=google)](https://deepmind.google/technologies/gemini/)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap_%2F_Google_Maps-7EBC6F?logo=openstreetmap)](https://www.openstreetmap.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

🌐 **Live Application**: [https://gyan-jyoti-demo1.netlify.app](https://gyan-jyoti-demo1.netlify.app)

**SafeRoute** is an intelligent personal safety web application designed to help individuals make context-aware decisions while navigating urban environments. Combining real-time LLM risk reasoning, geometric deviation tracking, community incident report clustering, distress audio detection, and an advanced **SOS Emergency Broadcast System (<100m Push Notifications & SMS)**, SafeRoute acts as a complete personal safety companion.

---

## 🌟 Key Features

### 🚨 Real-Time SOS Emergency System (<100m Push & SMS)
- **Hero Panic SOS Button**: Prominent panic button situated on the Home screen hero section and Left Sidebar.
- **100-Meter Proximity Filtering**: Calculates exact Haversine distances (`haversineDistance * 1000 <= 100`) to strictly target active community users within a 100-meter radius.
- **Real-Time Cross-Device Sync**: Synchronizes alerts across PC, Mobile, and Web Browsers via:
  - **Public Cloud WebSocket Relay** (`wss://`) for live production sites.
  - **Vite Server WebSocket Plugin** for local network Wi-Fi testing.
  - **BroadcastChannel & LocalStorage Events** for multi-tab browser sync.
- **Direct Phone & Profile Display**: Transmits the sender's full name and mobile phone number, allowing nearby responders to click **`📞 Call Sender`** directly.
- **Automated SMS Dispatch**: Drafts and launches native `sms:` messages containing live GPS coordinates (`https://maps.google.com/?q=LAT,LNG`) to saved emergency contacts.
- **Advanced Emergency Tools**:
  - **🔊 Web Audio API Siren**: Synthesizes a loud emergency siren audio alarm when SOS is triggered or received.
  - **🔋 Battery & GPS Metrics**: Includes live battery percentage (`navigator.getBattery()`) & GPS accuracy (`±10m`) in emergency payloads.
  - **🔒 Safety Cancellation PIN**: Requires a 4-digit PIN (default `1234`) to cancel active SOS alerts to prevent forced cancellation.
  - **🚨 Visual Strobe Light**: Rapid visual pulsing header animation for visual location signaling in low light.

---

### 🤖 Priority 1: AI-Enhanced Route Risk Scoring
- **LLM-Reasoned Relative Scoring**: Replaces static weighted scores with contextual risk reasoning powered by **Google Gemini 2.5 Flash** (with Groq API fallback).
- **Multi-Factor Risk Analysis**: Evaluates route geometry alongside nearby incident reports (recency, severity), lighting conditions, distance from emergency assistance (police, hospitals), community activity levels, and time of day.
- **Natural Language Explanations**: Surfaces 1-2 sentence risk justifications for candidate routes (e.g. *"Route A stays along illuminated main avenues with close proximity to the police station"*).
- **High-Performance 5-Min TTL Caching**: Keyed by route signature and environmental state to eliminate redundant API calls.
- **Strict Safety Guardrails**: All risk scores are explicitly framed as relative, approximate guidance — never presented as a guarantee of absolute safety.

---

### 📐 Priority 2: Geometric Route Deviation Detection
- **100% Client-Side Anomaly Tracking**: Uses perpendicular line-segment distance calculation (`minDistanceToPolylineMeters`) to track live position against planned routes with zero external API cost.
- **Non-Alarming In-App Prompt**: Detects sustained deviations (>150m for 2+ consecutive checks) and surfaces an in-app check: *"Looks like you've left your planned route — everything okay?"* with a 30-second countdown.
- **Dismissal & Escalation**: Tapping **"I'm OK — Dismiss"** resumes tracking without logging. Ignoring or confirming triggers automatic check-in emergency contact alerts.
- **Live Demo Simulator**: Built-in `🧪 Simulate Off-Route` button for testing off-route alerts without needing to walk outdoors.

---

### 🚨 Community Report Pattern Recognition
- **Emerging Risk Area Hotspots**: Client-side spatial clustering (`clusteringService.js`) groups incident reports by geographic proximity (300m radius) and recency (last 48 hours).
- **Dedicated Map Overlay**: Highlights emerging surges in incident density compared to historical baselines via a togglable `🚨 Emerging Hotspots` map layer.

---

### 🎙️ Audio & WebSpeech Distress Signal Detection
- **Web Audio API RMS Monitoring**: Measures decibel levels locally to detect sudden loud sound spikes or screams.
- **On-Device Keyword Recognition**: Integrates local browser `SpeechRecognition` to detect distress phrases (*"help"*, *"stop"*, *"police"*, *"emergency"*).
- **90-Second Cooldown Timeout**: Clicking **"I'M OK — CANCEL"** puts scream detection into a 90-second cooldown timeout to prevent re-trigger alarm loops while ambient noise remains loud.
- **Global Page Coverage**: Runs continuously in the background across all views (Home, Map, Report, Emergency, Profile).

---

### 💻 Responsive UI & Left Sidebar Navigation
- **Desktop Mode**: Sleek glassmorphic **Left Sidebar Navigation** containing brand logo, user quick profile badge, full navigation links, and panic SOS button.
- **Mobile Mode**: Optimized bottom navigation bar with floating emergency action button.

---

## 🛠️ Technology Stack

| Component | Technology / Service |
|---|---|
| **Frontend Framework** | React 19, Vite 8, React Router v7 |
| **Styling & UI** | Vanilla CSS (Glassmorphism design tokens), Lucide Icons |
| **Maps & Routing** | Google Maps JS API / Directions API, OpenStreetMap Overpass API |
| **AI / LLM Engine** | Google Gemini 2.5 Flash API, Groq Cloud API (`llama-3.3-70b-versatile`) |
| **Real-Time SOS Sync** | WebSockets (`wss://`), Vite WS Plugin, BroadcastChannel, LocalStorage |
| **Geocoding & Places** | Nominatim (OSM), Overpass API (Free tier facilities search) |
| **Audio & Speech** | Web Audio API (`AnalyserNode`, Oscillator), Web Speech API (`SpeechRecognition`) |
| **Hosting & Deployment** | Netlify (Vite SPA config with `netlify.toml` and `_redirects`) |

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
VITE_GEMINI_API_KEY="your_gemini_api_key" # Optional
```

### 4. Run Development Server
```bash
npm run dev
```
- Local URL: `http://localhost:5173`
- Network Wi-Fi URL: `http://<PC-IP>:5173` (for testing PC ↔ Mobile SOS alerts over local network)

### 5. Deploy to Netlify
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist --no-build
```

---

## 🎥 Quick Demo & Testing Instructions

1. **Test SOS Push Notifications (<100m)**:
   - Open [https://gyan-jyoti-demo1.netlify.app](https://gyan-jyoti-demo1.netlify.app) on **Tab 1** (or Mobile).
   - Open the link on **Tab 2** (or PC).
   - Click **🚨 SOS Emergency** on Tab 1.
   - Watch Tab 2 trigger an immediate push alert card showing sender name, phone, battery %, GPS accuracy, and direct **`📞 Call Sender`** button!
2. **Plan a Safe Route**:
   - Go to **Home** or **Map**, enter a destination (e.g. *"MM Hospital"*).
   - Inspect alternative routes showing **AI Risk-Reasoned Scores (0-100)** and LLM justifications.
3. **Test Off-Route Deviation**:
   - Tap **Start Route**, then click `🧪 Simulate Off-Route`.
   - Observe the non-alarming `OffRouteModal` countdown.
4. **Scream & Audio Detector**:
   - Toggle **Scream Detection** in **Settings (Profile)**.
   - Clap or shout to test dB response and WebSpeech keyword detection.

---

## 📜 License & Disclaimer

Distributed under the **MIT License**.

*Disclaimer: SafeRoute is an educational prototype and hackathon MVP. It does not replace official emergency services (dial 112 for emergencies).*
