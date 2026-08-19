# SafeRoute — Product Requirements Document
**Version:** 0.3 (Feature Expansion + Technical Architecture)
**Status:** Hackathon MVP
**Platform:** Mobile-first web app
**Owner:** SafeRoute product team

---

## 1. Product Positioning

SafeRoute is an intelligent personal safety companion that helps people choose lower-risk routes, understand nearby safety conditions, find nearby assistance, and quickly contact trusted people when they need help.

SafeRoute is **not**:
- A replacement for police or emergency services
- A guarantee of safety
- A crime-prediction system
- A surveillance platform

Every feature in this document is a decision-support signal. None may be presented as a guarantee, a prediction, or a substitute for professional emergency services.

---

## 2. Feature: Anonymous Community Activity

**Goal:** Use anonymized, aggregated location data from active users to estimate roughly how many people are in an area — never to track individuals.

**Requirements:**
- Never expose another user's exact GPS coordinates or identity.
- Aggregate users into geographic grid cells or clusters — no individual pins.
- Display approximate activity *levels*, not counts or user lists.
- Apply a minimum-user threshold before a cluster renders, to prevent re-identification in sparse areas.
- Let users disable location sharing entirely, with no penalty to core route-finding.
- State clearly, in-product, that community activity is an approximate signal, not proof of safety.

**UI states:**
```
👥 High community activity
👥 Moderate community activity
👥 Low community activity
Community activity unavailable
```

**Note:** Activity level may feed into the route safety score as one contextual input, but must never be treated on its own as "more people = safe" or "fewer people = dangerous."

---

## 3. Feature: Nearby Emergency Assistance

**Goal:** Surface real police stations, hospitals, fire stations, pharmacies, and security facilities near the user, sourced live rather than hand-maintained.

**Requirements:**
- Use the mapping provider's Places / Place Details API — do not maintain a manual facility database.
- Show, when available: name, distance, address, phone number, open status, directions, call action.
- If the API returns no phone number, hide the call button rather than inventing one.

**Example card:**
```
Police Station
0.8 km away
[Call]  [Directions]
```

---

## 4. Feature: One-Tap Calling

**Goal:** Turn "find a number, copy it, open the phone app" into a single tap.

**Requirements:**
- On supported mobile devices, use the device's native phone URI to launch the phone app.
- Callable targets: configured emergency service, trusted contacts, nearest police station, nearest hospital.
- Never claim SafeRoute can guarantee a call will connect.
- On desktop, provide an appropriate fallback (e.g. display the number to dial manually), since native calling usually isn't available.

---

## 5. Feature: Trusted Emergency Contacts

**Goal:** A short list of people the user can reach or notify in one action.

**Contact fields:**
- Name
- Phone number
- Relationship
- Optional email
- Enabled / disabled

**Actions:**
- Call
- Send emergency alert
- Share current location

**Consent requirement:** Location is only ever shared with a contact after the user has explicitly granted permission for that specific share.

---

## 6. Feature: Emergency Mode

**Goal:** A single dedicated mode optimized for speed under stress.

**On activation, in order:**
1. Request/obtain current location where permission is available.
2. Display current position on a map.
3. Show nearby emergency assistance.
4. Offer one-tap emergency calling.
5. Offer one-tap trusted-contact calling.
6. Allow the user to share current location.
7. Create an emergency event in the user's account.
8. Visibly indicate the mode is active.
9. Allow the user to stop the mode at any time.

**Example screen:**
```
EMERGENCY MODE ACTIVE

Current Location:
[Map]

Nearest Assistance:
Police — 0.7 km
Hospital — 1.3 km

[CALL EMERGENCY]
[CALL TRUSTED CONTACT]
[SHARE MY LOCATION]
```

**Boundary:** The interface must clearly and repeatedly distinguish SafeRoute from official emergency services — it assists, it does not dispatch.

---

## 6a. Feature: Audio-Triggered Emergency Detection (High-dB / Scream Detection)

**Goal:** Let SafeRoute recognize sudden loud sounds (e.g. a scream, shout, or crash) while the app is open in the foreground, and offer to activate Emergency Mode automatically — without requiring the user to touch the screen.

**How it works:**
- Uses the device microphone through the browser's **Web Audio API** (`getUserMedia` + `AnalyserNode`) — fully client-side, no third-party API, no cost.
- Continuously measures approximate decibel level (RMS of the audio signal) while the feature is toggled on and the app/tab is in the foreground.
- Two trigger patterns, both configurable:
  - **Sudden spike** — a sharp jump in volume above a rolling baseline (catches a scream or shout, not just a loud street).
  - **Sustained threshold** — volume stays above a set dB threshold for N consecutive seconds.
- On trigger, SafeRoute does **not** jump straight into Emergency Mode. It shows a short cancel window first.

**Trigger flow:**
```
Loud sound detected
"Are you okay? Activating Emergency Mode in 5s"
[I'M OK — CANCEL]
```
- If not cancelled in time, Emergency Mode (section 6) activates automatically: location captured, nearby help shown, one-tap calling ready, emergency event logged.
- If cancelled, nothing is logged or shared — the detection resets silently.

**Requirements:**
- Opt-in only. Off by default; user must explicitly enable "Listen for emergencies" in settings, with a plain-language explanation of what it does.
- Audio is analyzed locally, in real time, and is **never recorded, stored, or uploaded** by default — only the decibel/pattern measurement leaves the analyser, never raw audio.
- Show a persistent, unmistakable indicator (icon + label) whenever the mic is actively being listened to — never listen silently in the background.
- The cancel window must be easy to hit under stress: large button, short countdown (default 5s, user-adjustable).
- Threshold must be adjustable per user/environment to reduce false positives (a construction site vs. a quiet street need different baselines); provide a quick in-app calibration step ("stay quiet for 5 seconds") to set the baseline.
- If falsely triggered and confirmed as a false alarm repeatedly, prompt the user to raise the threshold or disable the feature — don't let it become an annoyance that gets ignored.

**Platform limitation to design around:** browsers (especially iOS Safari/WebView) suspend microphone access when the tab or app is backgrounded or the screen locks. This feature can only realistically run **while SafeRoute is open and the screen is on** in an MVP built as a website/webview — it is not a true background "always listening" system. State this limitation clearly in-product rather than implying always-on protection. A true background version would require a native app with foreground-service/background-audio entitlements, which is out of scope for this MVP.

---

## 7. Feature: Safety Check-In

**Goal:** Let a user tell SafeRoute "I'm heading somewhere, watch for my arrival."

**Flow:**
1. User selects an intent, e.g. "I'm traveling home."
2. User sets an expected arrival window, e.g. 30 minutes.
3. SafeRoute opens a check-in session.
4. User can confirm arrival, extend the timer, or cancel.

**If the timer expires unconfirmed:**
1. Notify the user first.
2. Give them the chance to extend or cancel.
3. Only if the user has explicitly opted into automatic escalation, notify selected trusted contacts.

**Hard rule:** Never silently contact emergency services without explicit authorization and a real, tested integration.

---

## 8. Feature: Safety Map Layers

**Goal:** One map, several togglable layers, so the user controls how much information they see.

**Layers:**
- User's location
- Lower-risk areas
- Moderate-risk areas
- Higher-risk / report-heavy areas
- Community reports
- Community activity density
- Police stations
- Hospitals
- Fire stations
- Other emergency facilities

Every layer can be independently enabled or disabled.

---

## 9. Feature: Enhanced Route Safety Algorithm

**Goal:** A relative, contextual score — never framed as objective or guaranteed safety.

**Optional inputs:**
- Reported incidents (type, severity, recency)
- Poor-lighting reports
- Community activity level
- Distance from emergency assistance
- Unsafe crossings
- Other verified safety reports
- Time of day

**Explicit non-assumption:** The model must not encode "more people = safe" or "fewer people = dangerous." Activity is one weighted, contextual signal among several — not a verdict. The safety score must never be claimed as objective or guaranteed safety.

**Example output:**
```
Route A — Safety Score: 88/100
Lower relative risk
Reasons:
- Fewer recent safety reports
- More community activity
- Nearer emergency assistance
- Avoids reported risk zone

Route B — Safety Score: 64/100
Higher relative risk
Reasons:
- Multiple recent reports
- Low activity
- Longer distance from emergency assistance
```

---

## 10. Requirement: Privacy for GPS Data

Because this product handles sensitive location data, privacy is a first-class requirement:

- Request location permission explicitly, with a stated reason.
- Minimize retention — avoid storing unnecessary historical location trails.
- Never publicly expose an individual user's location.
- Aggregate community activity before display, always.
- Provide a clear location-sharing opt-out with no feature penalty for core routing.
- Secure location data in transit and at rest.
- Delete temporary emergency location data per a defined retention policy.

---

## 11. Information Architecture

**Web navigation:**
Home · Safe Route · Safety Map · Emergency · Report · Check-In · Profile

**Mobile navigation (priority order):**
Home · Map · Emergency · Report · Profile

The Emergency action stays one tap away from anywhere in the app.

---

## 12. Screen Spec: Dashboard

```
Welcome back

Plan a Safe Route
[From] -> [To]

Quick Safety Actions:
[Emergency] [Share Location] [Check-In] [Nearby Help]

Nearby:
Police Station — 0.8 km
Hospital — 1.4 km

Community Activity:
Moderate

Recent Safety Alerts:
2 reports near your area
```

---

## 13. Data Model Additions

| Table | Purpose | Privacy / retention note |
|---|---|---|
| `trusted_contacts` | Name, phone, relationship, email, enabled flag per user | User-owned; deletable at will |
| `emergency_sessions` | Emergency-mode activation records | Retained per emergency-data policy, not indefinitely |
| `check_ins` | Active and past check-in sessions, timers, status | Expired sessions purged on a schedule |
| `location_shares` | Consent-gated shares of a user's location with a contact | Requires explicit per-share consent record |
| `community_activity` | Aggregated, thresholded grid-cell activity levels | No individual coordinates ever stored |
| `emergency_facilities` | Normalized facility records surfaced from the Places API | Derived / cached, not authoritative |
| `facility_cache` | Short-lived cache of Places API responses | Time-boxed TTL to respect provider terms |

---

## 14. Hackathon Demo Script (5 minutes)

1. Enter a destination.
2. SafeRoute generates multiple routes.
3. Relative safety scores are calculated.
4. Show why Route A scores safer than Route B.
5. Open the Safety Map.
6. Map shows community reports and activity level.
7. Nearby police station and hospital appear.
8. Open the police station's detail card and its phone info.
9. Demonstrate one-tap calling.
10. Add a trusted contact.
11. Start a safety check-in.
12. Demonstrate Emergency Mode with safe, clearly-labeled demo behavior.
13. Report an unsafe location.
14. Report appears in the community / admin system.
15. Explain how the report can influence future route-risk scoring once verified.

Use clearly labeled simulated data anywhere real-time data isn't available for the demo.

---

## 15. Technical Architecture & Stack

**Goal:** Ship as one responsive website, built once, wrapped as a mobile app shell for Android and iOS — no separate native codebase — while keeping ongoing API costs at zero for the MVP.

### Frontend
- **React**, mobile-first responsive layout (works standalone as a site, and as the content inside a WebView wrapper).
- Component states designed around one-hand mobile use first — Emergency and Check-In actions always reachable within a thumb's reach on small screens.
- **PWA basics** (manifest + service worker) even though it's wrapped in WebView — this also lets it install as a standalone home-screen app for users who don't go through the app stores, and enables Web Push for check-in escalation.

### Mobile wrapping (Android + iOS)
- **Android:** thin native shell using `WebView`, with permission bridging for geolocation, microphone, and `tel:`/`sms:` intents.
- **iOS:** thin native shell using `WKWebView`, same permission bridging. iOS is stricter about background mic/location — see the audio-detection limitation above; design the wrapper to request foreground-only permissions and be explicit with the user about what stops when the app is backgrounded.
- Both wrappers just load the responsive site — all real feature logic (routing, scoring, detection, calling) lives in the web app, not native code. This keeps one codebase for web + both app stores.

### Backend — Supabase
- **Postgres** for all tables in section 13 (`trusted_contacts`, `emergency_sessions`, `check_ins`, `location_shares`, `community_activity`, `emergency_facilities`, `facility_cache`).
- **Auth** for user accounts (email/OTP or phone OTP).
- **Realtime** for live check-in status and emergency-session updates to a trusted contact's view.
- **Edge Functions** for: check-in expiry escalation logic, facility-cache refresh, and thresholded aggregation of `community_activity` (never expose raw per-user rows to the client — aggregate server-side).
- **Row Level Security** so a user can only read their own contacts/sessions, and a trusted contact can only read a session that was explicitly shared with them.

### Free / no-cost APIs and services
| Need | Free option | Note |
|---|---|---|
| Maps + routing | **OpenStreetMap** tiles + **Leaflet**, routing via **OSRM** demo server or self-hosted | No API key required for OSM tiles at low volume; self-host OSRM if you outgrow the demo server's rate limits |
| Nearby facilities (police, hospital, etc.) | **Overpass API** (OpenStreetMap) | Free, no key; data completeness varies by region — gracefully hide missing fields (per section 3) rather than inventing them |
| Reverse geocoding | **Nominatim** (OSM) | Free, but rate-limited (~1 req/sec) — cache aggressively in `facility_cache` |
| Geolocation | Browser **Geolocation API** | Native, free, no third party |
| Calling | Native **`tel:`** URI | Free, no calling API needed, matches the one-tap calling spec exactly |
| Alerting a trusted contact | **`sms:`** URI (pre-filled, user sends) for zero-cost MVP; or **Web Push** via service worker for in-app alerts | Avoids paid SMS APIs (e.g. Twilio) entirely for the MVP; upgrade path exists later if a backend-sent SMS becomes a requirement |
| Audio / high-dB detection | Browser **Web Audio API** | Fully on-device, free, no API |
| Push notifications (check-in escalation) | **Web Push** (service worker + Supabase Edge Function) | Free, works once the PWA is installed or the tab has granted permission |

This stack keeps every moving part either native-browser or Supabase, so there's no recurring third-party API bill to demo or scale the MVP.

---

## 16. Open Questions / Assumptions

- Base app (route generation, community reporting, existing safety map) is assumed to already exist; this document covers the expansion features only.
- Mapping/Places provider set to OpenStreetMap (Overpass + Nominatim) to keep the MVP free — phone-number and open-status data will be less complete than a paid provider like Google Places; acceptable for a hackathon demo, worth revisiting if SafeRoute goes past MVP.
- Automatic escalation on check-in expiry requires explicit user opt-in; default behavior should be notify-only.
- Audio-triggered detection only works while the app is open in the foreground on web/WebView; true always-on background listening would require a fully native app and is out of scope for this MVP.
- SMS alerting via `sms:` URI requires the user to hit send themselves; a fully automatic backend-sent SMS would need a paid provider (e.g. Twilio) and is a possible post-MVP upgrade.