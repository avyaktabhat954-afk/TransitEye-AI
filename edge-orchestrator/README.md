# TransitEye Edge Orchestrator

> Modular Edge Intelligence Coordinator for Onboard Mobile Sensing Units

The **Edge Orchestrator** is an onboard Python service running on public transit buses. It coordinates multiple specialized AI perception streams, normalizes raw model outputs into canonical TransitEye shared contracts, attaches edge telemetry (bus ID, GPS, timestamps), and dispatches validated observations to the central backend.

---

## 1. Architectural Role

The orchestrator sits between edge AI models and the central Node/Express backend:

```text
[Cameras / GPS / IMU]
         │
         ▼
[Specialized AI Models] (Road Defects, Waterlogging, ANPR, Traffic, VRU)
         │
         ▼
[Model Adapters] (RoadDefectAdapter, IncidentAdapter, VehicleDensityAdapter)
         │ (Canonical Pydantic Contract Models)
         ▼
[Edge Orchestrator Core] ─── (Enrich with EdgeContext: GPS, Bus ID, UTC Time)
         │
         ▼
[Backend HTTP Client]
         │ (HTTP REST: POST /api/detections, /incidents, /vehicle-density)
         ▼
[Node.js / Express Backend (Port 5000)]
```

### Key Modularity Principle
- The core orchestrator **never** imports heavy AI frameworks (YOLO, PaddleOCR, PyTorch, OpenCV).
- AI developers implement independently swappable `ModelAdapter` interfaces.
- The orchestrator normalizes and validates data against canonical schemas before dispatching over the network.

---

## 2. Directory Structure

```text
edge-orchestrator/
├── app/
│   ├── config/              # Configuration & feature flags
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── models/              # Canonical Pydantic schema models
│   │   ├── __init__.py
│   │   ├── common.py        # Location & shared enums
│   │   ├── detection.py     # Canonical detection model
│   │   ├── incident.py      # Canonical incident/ANPR model
│   │   └── vehicle_density.py # Vehicle density model
│   ├── adapters/            # Pluggable perception adapters
│   │   ├── __init__.py
│   │   ├── base.py          # ModelAdapter abstract base class
│   │   └── fake_adapters.py # Deterministic fake adapters
│   ├── orchestrator/        # Core coordination engine
│   │   ├── __init__.py
│   │   ├── context.py       # GPS & telemetry context provider
│   │   └── core.py          # Adapter routing & dispatch
│   ├── clients/             # Central backend communication
│   │   ├── __init__.py
│   │   └── backend_client.py
│   └── main.py              # FastAPI server & endpoints
├── requirements.txt
└── README.md
```

---

## 3. Environment Variables

Configured via environment or default fallbacks:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `EDGE_BUS_ID` | `BUS-DEMO-001` | Unique sensing bus identifier |
| `BACKEND_API_URL` | `http://localhost:5000` | Target Node/Express backend URL |
| `EDGE_PORT` | `8000` | Local port for edge orchestrator FastAPI service |
| `ENABLE_ROAD_DEFECTS`| `true` | Feature toggle for road defect perception |
| `ENABLE_ANPR` | `true` | Feature toggle for incident / ANPR stream |
| `ENABLE_VEHICLE_DENSITY`| `true` | Feature toggle for traffic flow stream |
| `ENABLE_VRU` | `true` | Feature toggle for vulnerable road user stream |
| `ENABLE_WATERLOGGING`| `true` | Feature toggle for waterlogging stream |

---

## 4. Setup & Running Locally

### Prerequisites
- Python 3.13.1 (tested & verified)
- Node.js 18+ (for central backend)

### Virtual Environment (Optional / Recommended)
```bash
# From workspace root or edge-orchestrator directory:
python -m venv .venv

# Activate on Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Or on Linux/macOS:
source .venv/bin/activate
```

### Dependency Installation
```bash
# Minimal dependencies (FastAPI, Uvicorn, Pydantic, Requests)
# No heavy ML dependencies (no OpenCV, YOLO, PyTorch, PaddleOCR)
pip install -r requirements.txt
```

### Start Central Backend (Port 5000)
In Terminal 1 (from `backend/` directory):
```bash
npm start
```
Or from root:
```bash
node backend/src/server.js
```

### Start Edge Orchestrator Server (Port 8000)
In Terminal 2 (from `edge-orchestrator/` directory):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Or from workspace root:
```bash
python -m uvicorn app.main:app --app-dir edge-orchestrator --host 0.0.0.0 --port 8000
```

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "success": true,
  "service": "TransitEye Edge Orchestrator",
  "status": "healthy",
  "bus_id": "BUS-DEMO-001",
  "backend_url": "http://localhost:5000",
  "timestamp": "2026-09-03T15:00:00.000Z"
}
```

---

## 5. Running the Fake E2E Test Pipeline

To test the entire pipeline without running real AI models:

```bash
# Run from repository root
python tests/test_edge_orchestrator.py
```

---

## 6. Features Intentionally Deferred to Later Checkpoints / Day 3

This skeleton deliberately excludes the following production edge systems:
- **Finite State Machine (FSM)**: NORMAL → ALERT → INCIDENT tiered processing.
- **SQLite Local Buffering**: Offline local persistence.
- **Store-and-Forward & Retry Queue**: Network disruption resilience.
- **Multi-Bus Consensus**: Multi-pass observation confirmation.
- **PostGIS Road Segment Matching**: Local GIS map-matching.
- **Real GPS / IMU Hardware Drivers**: Serial / NMEA daemon integration.
