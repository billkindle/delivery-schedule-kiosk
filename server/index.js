import 'dotenv/config'
import express from 'express'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { getCalendarEvents } from './graphClient.js'

const app = express()
const PORT = process.env.PORT || (process.env.NODE_ENV === 'development' ? 3001 : 3000)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '../dist')

// Serve built React app (production only — in dev, Vite handles the frontend)
if (existsSync(distPath)) {
  app.use(express.static(distPath))
}

app.get('/api/events', async (req, res) => {
  if (req.query.demo === '1') {
    return res.json({ events: mockEvents(), fetchedAt: new Date().toISOString() })
  }
  try {
    const events = await getCalendarEvents()
    res.json({ events, fetchedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[graph]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// SPA fallback (production)
if (existsSync(distPath)) {
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

function mockEvents() {
  const d = (offsetDays, h, m) => {
    const dt = new Date()
    dt.setUTCDate(dt.getUTCDate() + offsetDays)
    dt.setUTCHours(h, m, 0, 0)
    return dt.toISOString()
  }
  return [
    { id: '1', subject: 'Riverside Chemical – Monthly Replenishment', isAllDay: false, categories: ['Route 2'], start: { dateTime: d(0, 7, 30) }, end: { dateTime: d(0, 9, 0) }, location: { displayName: '1420 Riverside Industrial Pkwy, Springfield' }, bodyPreview: 'Full pallet. Forklift required. Contact: Mike Nguyen x4421' },
    { id: '2', subject: 'MidState Manufacturing', isAllDay: false, categories: ['Route 1'], start: { dateTime: d(0, 10, 0) }, end: { dateTime: d(0, 11, 30) }, location: { displayName: '800 Commerce Blvd, Shelbyville' }, bodyPreview: 'Dock 3 – call ahead 30 min. 4 drums SS-40.' },
    { id: '3', subject: 'Apex Plastics – Emergency Restock', isAllDay: false, categories: ['Route 3'], start: { dateTime: d(0, 13, 0) }, end: { dateTime: d(0, 14, 0) }, location: { displayName: '220 North Park Dr, Capital City' }, bodyPreview: 'URGENT – out of stock. Bypass normal scheduling.' },
    { id: '4', subject: 'Valley Foods Processing', isAllDay: false, categories: ['Route 2'], start: { dateTime: d(0, 15, 30) }, end: { dateTime: d(0, 16, 30) }, location: { displayName: '77 Valley Road, Ogdenville' }, bodyPreview: 'Food-grade product only. Sanitized truck required.' },
    { id: '5', subject: 'GreenLeaf Agriculture Supply', isAllDay: false, categories: ['Route 4'], start: { dateTime: d(1, 8, 0) }, end: { dateTime: d(1, 9, 30) }, location: { displayName: '3300 Farm Bureau Rd, North Haverbrook' }, bodyPreview: '6 totes herbicide concentrate. Hazmat placards required.' },
    { id: '6', subject: 'Metro Water Authority', isAllDay: false, categories: ['Route 1'], start: { dateTime: d(1, 11, 0) }, end: { dateTime: d(1, 12, 0) }, location: { displayName: '50 Civic Center Plaza, Springfield' }, bodyPreview: 'Chlorine cylinders. See spec sheet #MW-2024.' },
    { id: '7', subject: 'Pinnacle Coatings Inc.', isAllDay: false, categories: ['Route 3'], start: { dateTime: d(1, 14, 30) }, end: { dateTime: d(1, 15, 30) }, location: { displayName: '990 Industrial Loop, Shelbyville' }, bodyPreview: '2 pallets solvent. Driver signature required.' },
    { id: '8', subject: 'Lakeside Brewing Co.', isAllDay: false, categories: ['Route 2'], start: { dateTime: d(2, 9, 0) }, end: { dateTime: d(2, 10, 0) }, location: { displayName: '12 Brewery Lane, Capital City' }, bodyPreview: 'Cleaning compounds – food safe. Bring COA.' },
    { id: '9', subject: 'Southern Steel Fabricators', isAllDay: false, categories: ['Route 5'], start: { dateTime: d(2, 13, 0) }, end: { dateTime: d(2, 15, 0) }, location: { displayName: '4400 Steel Mill Rd, Brockway' }, bodyPreview: 'Large order – 2 trucks required. Coordinate with dispatch.' },
    { id: '10', subject: 'Northgate Hospital System', isAllDay: false, categories: ['Route 1'], start: { dateTime: d(3, 7, 0) }, end: { dateTime: d(3, 8, 0) }, location: { displayName: '1 Medical Center Dr, Springfield' }, bodyPreview: 'Sterile products. White glove delivery. Check in at loading dock B.' },
    { id: '11', subject: 'Tri-County Ag Co-op', isAllDay: false, categories: ['Route 4'], start: { dateTime: d(3, 10, 30) }, end: { dateTime: d(3, 12, 0) }, location: { displayName: '8800 County Road 14, Ogdenville' }, bodyPreview: 'Seasonal order – call to confirm field access.' },
    { id: '12', subject: 'PolyFlex Solutions', isAllDay: false, categories: ['Route 3'], start: { dateTime: d(4, 9, 30) }, end: { dateTime: d(4, 11, 0) }, location: { displayName: '560 Polymer Drive, North Haverbrook' }, bodyPreview: 'Specialty resin – temperature controlled truck.' },
  ]
}

app.listen(PORT, () => {
  console.log(`[server] Delivery Schedule API → http://localhost:${PORT}`)
})
