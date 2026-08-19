import { haversineDistance } from './placesService'

/**
 * Stretch 1: Community Report Pattern Recognition
 * Clusters incident reports by geographic proximity (300m) and time window (48 hours)
 */
export function detectEmergingPatterns(reports, maxRadiusMeters = 300, hoursWindow = 48) {
  if (!reports || reports.length === 0) return []

  const now = Date.now()
  const windowMs = hoursWindow * 60 * 60 * 1000

  // Filter recent reports vs older reports
  const recentReports = []
  const olderReports = []

  reports.forEach(r => {
    const reportTime = r.timestamp || (now - Math.random() * 72 * 3600 * 1000)
    if (now - reportTime <= windowMs) {
      recentReports.push({ ...r, reportTime })
    } else {
      olderReports.push({ ...r, reportTime })
    }
  })

  // Simple distance-based spatial clustering on recent reports
  const clusters = []

  recentReports.forEach(r => {
    let matchedCluster = clusters.find(c => {
      const dist = haversineDistance(c.centerLat, c.centerLng, r.lat, r.lng) * 1000
      return dist <= maxRadiusMeters
    })

    if (matchedCluster) {
      matchedCluster.reports.push(r)
      matchedCluster.recentCount++
      // Update center
      matchedCluster.centerLat = (matchedCluster.centerLat + r.lat) / 2
      matchedCluster.centerLng = (matchedCluster.centerLng + r.lng) / 2
    } else {
      clusters.push({
        id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        centerLat: r.lat,
        centerLng: r.lng,
        reports: [r],
        recentCount: 1,
        historicalBaseline: 0
      })
    }
  })

  // Calculate historical baseline for each cluster
  clusters.forEach(c => {
    const historicalCount = olderReports.filter(r => {
      const dist = haversineDistance(c.centerLat, c.centerLng, r.lat, r.lng) * 1000
      return dist <= maxRadiusMeters
    }).length
    c.historicalBaseline = historicalCount
  })

  // Filter for clusters that show an emerging surge (e.g. recentCount >= 2 and > historicalBaseline)
  const emergingClusters = clusters.filter(c => c.recentCount >= 2 && c.recentCount > c.historicalBaseline)

  return emergingClusters.map(c => ({
    ...c,
    badgeText: `🚨 Emerging Pattern: ${c.recentCount} reports in last ${hoursWindow}h vs usual ${c.historicalBaseline}`,
    severity: c.recentCount >= 4 ? 'high' : 'moderate'
  }))
}
