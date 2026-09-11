# TransitEye — Frontend API Integration Guide

> Backend frozen and presentation-ready.
> Backend: http://localhost:5000 | Frontend: http://localhost:5173
> CORS: Access-Control-Allow-Origin: * — all origins accepted. No proxy needed.
> Auth: None required for GET endpoints.

---

## 1. Common Response Envelope

All GET endpoints return:

```json
{
  "success": true,
  "count": 1,
  "data": [],
  "pagination": { "total": 42, "limit": 50, "offset": 0 }
}
```

- `data` is **always an array**
- `pagination.total` = total matching records across all pages
- `pagination.count` = records on current page
- Errors return `{ "success": false, "error": "...", "details": [] }`

---

## 2. GET /api/detections

### Query Parameters

| Parameter | Type | Default | Allowed |
|-----------|------|---------|---------|
| `type` | enum | — | `road_defect`, `waterlogging`, `vru_safety` |
| `subtype` | string | — | any string |
| `status` | enum | — | `pending`, `confirmed`, `in_review`, `resolved`, `rejected` |
| `severity` | enum | — | `low`, `medium`, `high`, `critical` |
| `segment_id` | string | — | `SEG-DEL-001`, `SEG-DEL-002`, `SEG-DEL-003` |
| `since` | ISO 8601 | — | e.g. `2026-09-01T00:00:00Z` |
| `until` | ISO 8601 | — | e.g. `2026-09-10T00:00:00Z` |
| `limit` | integer | 50 | 1-200 |
| `offset` | integer | 0 | >= 0 |

### Real Response Example

```json
{
  "success": true,
  "count": 1,
  "data": [{
    "id": "det-rd-2026-001",
    "type": "road_defect",
    "subtype": "pothole",
    "confidence": 0.92,
    "severity": "high",
    "location": {
      "latitude": 28.613939,
      "longitude": 77.209021,
      "altitude": 216.5,
      "speed": 34.2,
      "heading": 178.5,
      "accuracy": 2.1
    },
    "geom": {
      "type": "Point",
      "coordinates": [77.209021, 28.613939],
      "crs": { "type": "name", "properties": { "name": "EPSG:4326" } }
    },
    "segment_id": "SEG-DEL-001",
    "status": "pending",
    "confirmed_by_count": 1,
    "bus_id": "BUS-DEL-101",
    "timestamp": "2026-09-03T14:15:30+00:00",
    "thumbnail_url": "https://storage.transiteye.city/evidence/thumbnails/pothole_det_rd_001.jpg",
    "metadata": {
      "confirming_buses": ["BUS-DEL-101"],
      "estimated_depth_cm": 8.5
    },
    "created_at": "2026-09-10T16:36:58.197931+00:00"
  }],
  "pagination": { "total": 1, "limit": 50, "offset": 0 }
}
```

### Key Fields for Frontend

| Field | Use |
|-------|-----|
| `location.latitude`, `location.longitude` | **Leaflet map marker** |
| `severity` | Marker color (low=green, medium=yellow, high=orange, critical=red) |
| `type` | Layer icon selection |
| `status` | Status badge |
| `confirmed_by_count` | Show corroboration (>1 = multi-bus confirmed) |
| `metadata.confirming_buses` | List of buses that agreed |
| `thumbnail_url` | Evidence image (may be null) |

> CRITICAL: Use `location.latitude`/`location.longitude` for Leaflet.
> `geom.coordinates` is `[longitude, latitude]` (GeoJSON) — reversed. Do NOT pass to Leaflet directly.

---

## 3. GET /api/incidents

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `bus_id` | string | — | filter by bus |
| `trigger_reason` | string | — | e.g. `bus_lane_obstruction` |
| `since` | ISO 8601 | — | |
| `until` | ISO 8601 | — | |
| `limit` | integer | 50 | 1-200 |
| `offset` | integer | 0 | >= 0 |

### Real Response Example

```json
{
  "success": true,
  "count": 1,
  "data": [{
    "id": "inc-2026-005",
    "plate_text": "DL01AB1234",
    "plate_confidence": 0.96,
    "trigger_reason": "bus_lane_obstruction",
    "location": {
      "latitude": 28.628912,
      "longitude": 77.206531,
      "altitude": 215,
      "speed": 12,
      "heading": 45,
      "accuracy": 1.5
    },
    "geom": {
      "type": "Point",
      "coordinates": [77.206531, 28.628912],
      "crs": { "type": "name", "properties": { "name": "EPSG:4326" } }
    },
    "clip_url": "https://storage.transiteye.city/evidence/clips/inc_2026_005.mp4",
    "bus_id": "BUS-DEL-103",
    "timestamp": "2026-09-03T14:28:15+00:00",
    "metadata": { "vehicle_type": "private_suv", "obstruction_duration_sec": 42 },
    "created_at": "2026-09-10T16:35:51.549518+00:00"
  }],
  "pagination": { "total": 1, "limit": 50, "offset": 0 }
}
```

### Key Fields for Frontend

| Field | Use |
|-------|-----|
| `plate_text` | Display in incident feed (already uppercase) |
| `trigger_reason` | Incident type badge |
| `location.latitude`, `location.longitude` | Map marker |
| `clip_url` | Evidence video (may be null — render conditionally) |
| `timestamp` | Incident time |

---

## 4. GET /api/vehicle-density

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `segment_id` | string | — | e.g. `SEG-DEL-001` |
| `since` | ISO 8601 | — | |
| `until` | ISO 8601 | — | |
| `limit` | integer | 50 | 1-200 |
| `offset` | integer | 0 | >= 0 |

### Real Response Example

```json
{
  "success": true,
  "count": 1,
  "data": [{
    "id": "vd-2026-004",
    "segment_id": null,
    "vehicle_count": 28,
    "class_breakdown": {
      "car": 16, "bus": 3, "truck": 1, "motorcycle": 6, "auto_rickshaw": 2
    },
    "bus_id": "BUS-DEL-101",
    "recorded_at": "2026-09-03T14:25:00+00:00",
    "location": {
      "latitude": 28.614521,
      "longitude": 77.209845,
      "altitude": 216,
      "speed": 31
    },
    "geom": {
      "type": "Point",
      "coordinates": [77.209845, 28.614521],
      "crs": { "type": "name", "properties": { "name": "EPSG:4326" } }
    },
    "metadata": { "congestion_level": "moderate", "sampling_window_sec": 30 },
    "created_at": "2026-09-10T16:35:52.658584+00:00"
  }],
  "pagination": { "total": 1, "limit": 50, "offset": 0 }
}
```

### Key Fields for Frontend

| Field | Use |
|-------|-----|
| `vehicle_count` | Circle radius on map / heatmap intensity |
| `class_breakdown` | Ready-made pie chart data |
| `location.latitude`, `location.longitude` | Map placement |
| `recorded_at` | Sample time (use this, NOT `created_at`) |
| `metadata.congestion_level` | Congestion label |

---

## 5. GET /api/health

```
GET http://localhost:5000/api/health
Response: { "success": true, "service": "TransitEye Backend", "status": "healthy", "timestamp": "..." }
```

Call this first to verify the backend is reachable.

---

## 6. Pagination

```javascript
// Fetch everything for a small demo DB:
GET /api/detections?limit=200

// Check if more pages exist:
const hasMore = pagination.offset + pagination.limit < pagination.total;

// Page 2:
GET /api/detections?limit=50&offset=50
```

---

## 7. Filtering (all AND, all server-side)

```javascript
// Single filter
GET /api/detections?type=road_defect
GET /api/detections?severity=critical
GET /api/detections?status=confirmed
GET /api/detections?segment_id=SEG-DEL-001

// Combined
GET /api/detections?type=road_defect&severity=critical&status=confirmed

// Time range
GET /api/detections?since=2026-09-01T00:00:00Z&until=2026-09-10T00:00:00Z
```

Invalid enum values return 400. Unknown parameters are silently ignored.

---

## 8. Road Segment IDs (hardcode these — no /api/road-segments endpoint)

| ID | Name | City |
|----|------|------|
| `SEG-DEL-001` | Kartavya Path (Rajpath) | Delhi |
| `SEG-DEL-002` | Ring Road - AIIMS to Moolchand | Delhi |
| `SEG-DEL-003` | Outer Ring Road - Punjabi Bagh Flyover | Delhi |

---

## 9. Local Development Setup

```bash
# Terminal 1: Backend
node backend/src/server.js
# → http://localhost:5000

# Terminal 2: Frontend
cd frontend/
npm run dev
# → http://localhost:5173
```

No proxy config needed. CORS is open (`*`).

```javascript
const API_BASE = 'http://localhost:5000';
fetch(`${API_BASE}/api/detections`); // works directly from browser
```

### Install Required npm Packages

```bash
cd frontend/
npm install leaflet react-leaflet recharts
```

---

## 10. Recommended Polling (no WebSocket support)

```javascript
const API_BASE = 'http://localhost:5000';

async function fetchDetections(params = {}) {
  const qs = new URLSearchParams({ limit: 200, ...params });
  const res = await fetch(`${API_BASE}/api/detections?${qs}`);
  return res.json();
}

// React hook
useEffect(() => {
  const load = () => fetchDetections().then(d => setDetections(d.data));
  load();
  const id = setInterval(load, 15_000); // 15s for live demo feel
  return () => clearInterval(id);
}, []);
```

---

## 11. Dashboard Building Patterns

### Summary Counters

```javascript
const { data, pagination } = await fetchDetections({ limit: 200 });
const stats = {
  total: pagination.total,
  confirmed: data.filter(d => d.status === 'confirmed').length,
  pending: data.filter(d => d.status === 'pending').length,
  critical: data.filter(d => d.severity === 'critical').length,
  road_defect: data.filter(d => d.type === 'road_defect').length,
  waterlogging: data.filter(d => d.type === 'waterlogging').length,
};
```

### Leaflet Map Markers

```javascript
import L from 'leaflet';
const severityColor = {
  low: 'green', medium: 'yellow', high: 'orange', critical: 'red'
};

detections.forEach(d => {
  L.circleMarker([d.location.latitude, d.location.longitude], {
    color: severityColor[d.severity],
    radius: d.confirmed_by_count > 1 ? 10 : 6,
  })
  .bindPopup(`
    <b>${d.type}</b> — ${d.subtype}<br/>
    Severity: ${d.severity}<br/>
    Status: ${d.status}<br/>
    Buses: ${d.confirmed_by_count}<br/>
    ${d.timestamp}
  `)
  .addTo(map);
});
```

### Vehicle Density Pie Chart (Recharts)

```javascript
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const breakdownData = Object.entries(record.class_breakdown).map(([name, value]) => ({ name, value }));
const COLORS = ['#0088FE','#00C49F','#FFBB28','#FF8042','#AA4499'];

<PieChart width={300} height={300}>
  <Pie data={breakdownData} dataKey="value" nameKey="name">
    {breakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
  </Pie>
  <Tooltip />
</PieChart>
```

### Incident Feed

```javascript
const { data: incidents } = await fetch(`${API_BASE}/api/incidents?limit=20`).then(r => r.json());

incidents.map(inc => (
  <div key={inc.id}>
    <span>{inc.plate_text}</span>
    <span>{inc.trigger_reason.replace(/_/g, ' ')}</span>
    <span>{new Date(inc.timestamp).toLocaleString()}</span>
    {inc.clip_url && <a href={inc.clip_url}>View Clip</a>}
  </div>
))
```

---

## 12. Known Limitations

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| No WebSocket/SSE | No real-time push | Poll every 15–30s |
| No /api/road-segments | Can't list segments dynamically | Hardcode 3 known IDs |
| `segment_id` can be null | Some records have no segment | Show all markers regardless |
| `thumbnail_url` / `clip_url` can be null | Some records have no media | Render conditionally |
| No PATCH endpoints | Can't change status via UI | Display status read-only |
| `geom.coordinates` = [lon, lat] | Reversed from Leaflet | Use `location.latitude`/`longitude` |

---

## 13. Demo Data Gap

Current production database has minimal data:
- 1 detection (road_defect, high, pending)
- 1 incident (bus_lane_obstruction)
- 1 vehicle density record (segment_id null)

For a convincing demo, the backend team will need to approve and insert seed data covering:
- All 3 detection types across all 3 segments
- Multiple severity levels including critical + confirmed (corroborated)
- Multiple incidents with different trigger_reasons
- Vehicle density records for each segment

**Do not insert this data without authorization from the backend owner.**
