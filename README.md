# haochi-midao (好吃米道)

A web application for analyzing Chinese food delivery orders from raw WeChat export Excel files. Parses order text to extract food item quantities, validates totals against the WeChat summary table, aggregates across selected orders, generates reports/CSV exports, and prints Avery 5167 label PDFs.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: FastAPI (Python), pandas, openpyxl, reportlab

## Getting Started

```bash
# Install everything
make install

# Start backend (port 8000)
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

# Start frontend (port 5173, proxies /api to backend)
cd frontend && pnpm dev
```

Requires Python 3.7+ and Node.js 18.12+.

## Application Flow

```
Login → Upload (.xlsx) → Preview/Edit Orders → Analyze | Labels | Routing
```

1. **Login** — Password-protected entry with Dudu mascot
2. **Upload** — Upload a raw WeChat export `.xlsx` file
3. **Preview/Edit** — Review parsed orders, add/edit/remove manual orders before analysis. Discrepancy warnings shown if parsed totals don't match the WeChat summary table
4. **Analyze** — Select orders via click-and-drag, view aggregated results (item list, summary metrics, bar chart, report). Download CSV or text report
5. **Labels** — Preview and download Avery 5167 label PDFs for the analyzed items
6. **Routing** — Select orders, set start address and departure time, get optimized delivery route with traffic-aware travel times via Google Maps API

## Features

- WeChat export Excel parsing with summary table validation
- Preview/edit page with manual order entry (modal form with quantity steppers)
- Edit and remove manually added orders (pencil/X icon buttons)
- Drag-select order table with Select All / Clear All
- Analysis results with three views: item list, summary with bar chart, text report
- CSV and report downloads
- Avery 5167 label PDF generation with Chinese character support
- Delivery route optimization with traffic-aware travel times (Google Maps Distance Matrix API)
- Rose/pink themed UI with Bubu & Dudu branding

## Testing

```bash
# All tests
make test

# Backend only (43 tests)
cd backend && .venv/bin/pytest

# Frontend only (19 tests)
cd frontend && pnpm test -- --run

# Type-check frontend
cd frontend && pnpm run lint
```

## Project Structure

```
haochi-midao/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Auth gate, preview/analyze/labels routing
│   │   ├── api.ts               # API fetch wrappers
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── index.css            # Tailwind imports + animations
│   │   ├── components/
│   │   │   ├── AddOrderForm.tsx  # Modal form for adding/editing orders
│   │   │   ├── AnalysisResults.tsx
│   │   │   ├── DiscrepancyWarning.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── GroupBar.tsx
│   │   │   ├── LabelPreview.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── OrderTable.tsx
│   │   ├── hooks/               # useAuth, useDragSelect
│   │   └── pages/
│   │       ├── AnalyzePage.tsx
│   │       ├── LabelsPage.tsx
│   │       ├── PreviewEditPage.tsx
│   │       └── RoutingPage.tsx
│   ├── public/                  # Bubu & Dudu image assets
│   ├── tests/                   # Vitest unit tests
│   └── e2e/                     # Playwright e2e tests
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── analyzer.py          # Order parsing and analysis
│   │   ├── labels.py            # PDF label generation
│   │   ├── routing.py           # Delivery route optimization
│   │   ├── auth.py              # Password verification
│   │   ├── config.py            # Password + API keys from env/config
│   │   ├── schemas.py           # Pydantic models
│   │   └── routers/             # upload, menu, analyze, labels, routing
│   ├── data/menu.csv            # Food item reference database
│   └── tests/                   # pytest suite
└── Makefile
```
