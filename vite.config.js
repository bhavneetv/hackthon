import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom Vite plugin for real-time WebSocket broadcast across PC, Mobile & Tablets
function sosWebSocketPlugin() {
  return {
    name: 'sos-websocket-plugin',
    configureServer(server) {
      server.ws.on('saferoute:sos_alert', (data, client) => {
        // Broadcast incoming SOS payload to ALL connected browsers & mobile devices
        server.ws.send('saferoute:sos_broadcast', data)
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sosWebSocketPlugin()],
  server: {
    host: true, // Exposes server to network IP (http://<PC-IP>:5173) for mobile testing
    cors: true
  }
})

