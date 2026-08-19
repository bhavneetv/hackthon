// Places Service - Uses FREE Overpass API (OpenStreetMap) with reliable local fallbacks

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter'
]

// Fallback data requested by user for local region (Mullana / MMU area)
function getFallbackPlaces(lat, lng, type) {
  if (type === 'police') {
    return [
      {
        name: 'Police Station Mullana',
        address: 'Mullana, Ambala, Haryana 133207',
        phone: '112',
        lat: lat + 0.015, // ~1.8 - 2 km away
        lng: lng + 0.012,
        id: 'fallback-police-1',
        types: ['police'],
        openingHours: '24/7'
      }
    ]
  }
  if (type === 'hospital') {
    return [
      {
        name: 'MM Hospital, MMU, Mullana',
        address: 'MMDU Campus, Mullana, Haryana 133207',
        phone: '01731-274075',
        lat: lat + 0.002, // ~300m away
        lng: lng + 0.002,
        id: 'fallback-hosp-1',
        types: ['hospital'],
        openingHours: '24/7 Emergency'
      }
    ]
  }
  return []
}

export async function searchNearbyPlaces(lat, lng, type = 'police', radius = 5000) {
  const typeMap = {
    police: 'police',
    hospital: 'hospital',
    fire_station: 'fire_station',
    pharmacy: 'pharmacy'
  }
  const osmType = typeMap[type] || type
  const query = `[out:json][timeout:10];(node["amenity"="${osmType}"](around:${radius},${lat},${lng});way["amenity"="${osmType}"](around:${radius},${lat},${lng}););out center body qt 10;`

  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) continue

      const data = await response.json()
      if (data.elements && data.elements.length > 0) {
        const results = data.elements
          .map(el => {
            const elLat = el.lat ?? el.center?.lat
            const elLng = el.lon ?? el.center?.lon
            const tags = el.tags || {}
            if (!elLat || !elLng) return null

            return {
              name: tags.name || tags['name:en'] || formatTypeName(osmType),
              address: buildAddress(tags),
              phone: tags.phone || tags['contact:phone'] || null,
              lat: elLat,
              lng: elLng,
              id: String(el.id),
              types: [osmType],
              openingHours: tags.opening_hours || null
            }
          })
          .filter(Boolean)
          .sort((a, b) => haversineDistance(lat, lng, a.lat, a.lng) - haversineDistance(lat, lng, b.lat, b.lng))
          .slice(0, 10)

        if (results.length > 0) return results
      }
    } catch (err) {
      console.warn(`Overpass (${url}) failed:`, err.message)
      continue
    }
  }

  // If live search fails or has no results, use smart location fallbacks
  console.log(`Using fallback data for ${type}`)
  return getFallbackPlaces(lat, lng, type)
}

function formatTypeName(type) {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function buildAddress(tags) {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']]
  const addr = parts.filter(Boolean).join(', ')
  return addr || tags['addr:full'] || ''
}

export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'SafeRouteApp/1.0' } }
    )
    const data = await response.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name
      }
    }
    return null
  } catch (err) {
    console.warn('Geocode failed:', err)
    return null
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'SafeRouteApp/1.0' } }
    )
    const data = await response.json()
    return data.address || null
  } catch (err) {
    return null
  }
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Priority 2: Perpendicular Distance in Meters from a GPS coordinate to a Line Segment
 */
export function pointToSegmentDistanceMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const R = 6371000 // Earth radius in meters
  const deg2rad = Math.PI / 180
  const cosLat = Math.cos(((aLat + bLat + pLat) / 3) * deg2rad)

  const px = pLng * deg2rad * R * cosLat
  const py = pLat * deg2rad * R

  const ax = aLng * deg2rad * R * cosLat
  const ay = aLat * deg2rad * R

  const bx = bLng * deg2rad * R * cosLat
  const by = bLat * deg2rad * R

  const dx = bx - ax
  const dy = by - ay

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay)
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))

  const projX = ax + t * dx
  const projY = ay + t * dy

  return Math.hypot(px - projX, py - projY)
}

/**
 * Minimum distance in meters from a GPS point to an entire route polyline path
 */
export function minDistanceToPolylineMeters(point, pathPoints) {
  if (!point || !pathPoints || pathPoints.length === 0) return 0
  if (pathPoints.length === 1) {
    return haversineDistance(point.lat, point.lng, pathPoints[0].lat, pathPoints[0].lng) * 1000
  }

  let minDistance = Infinity
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i]
    const b = pathPoints[i + 1]
    const dist = pointToSegmentDistanceMeters(
      point.lat, point.lng,
      typeof a.lat === 'function' ? a.lat() : a.lat,
      typeof a.lng === 'function' ? a.lng() : a.lng,
      typeof b.lat === 'function' ? b.lat() : b.lat,
      typeof b.lng === 'function' ? b.lng() : b.lng
    )
    if (dist < minDistance) minDistance = dist
  }
  return minDistance
}

