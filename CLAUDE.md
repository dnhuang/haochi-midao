# CLAUDE.md

## Project Overview

**haochi-midao** (好吃米道) — A web application for analyzing Chinese food delivery orders from raw WeChat export Excel files. Parses order text to extract food item quantities, validates totals against the WeChat summary table, aggregates across selected orders, generates reports/CSV exports, and prints Avery 5167 label PDFs.

Replaces an earlier Streamlit prototype (`food-delivery` repo). The core parsing/analysis logic is migrated from that project.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Key Python deps**: pandas, openpyxl (xlsx parsing), reportlab (PDF generation)

## Project Structure

```
haochi-midao/
├── frontend/              # React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx        # Auth gate + tab navigation
│   │   ├── api.ts         # Fetch wrappers for all endpoints
│   │   ├── types.ts       # TypeScript interfaces
│   │   ├── components/    # LoginForm, FileUpload, OrderTable, AnalysisResults, LabelPreview, DiscrepancyWarning
│   │   ├── hooks/         # useAuth, useDragSelect
│   │   └── pages/         # AnalyzePage, LabelsPage
│   ├── tests/             # Vitest unit tests
│   ├── e2e/               # Playwright e2e tests
│   └── vite.config.ts     # Tailwind plugin + /api proxy
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI entry point, CORS, router registration
│   │   ├── analyzer.py    # Core parsing logic (migrated)
│   │   ├── labels.py      # PDF label generation (migrated)
│   │   ├── auth.py        # X-Password header verification
│   │   ├── config.py      # Password from env var or config.json
│   │   ├── schemas.py     # Pydantic request/response models
│   │   └── routers/       # upload, menu, analyze, labels
│   ├── data/
│   │   └── menu.csv       # Food item reference database
│   ├── tests/             # pytest test suite
│   └── requirements.txt
├── .github/workflows/ci.yml  # CI pipeline (lint, test, e2e)
├── Makefile               # Root-level convenience commands
└── CLAUDE.md
```

## Commands

```bash
# Install everything (root Makefile)
make install

# Backend
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000   # dev server
cd backend && .venv/bin/pytest                                       # tests (25 tests)
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .  # lint

# Frontend (requires Node 18.12+, uses pnpm)
cd frontend && pnpm dev                  # dev server (port 5173, proxies /api → :8000)
cd frontend && pnpm test -- --run        # unit tests (12 tests)
cd frontend && pnpm run lint             # type-check (tsc --noEmit)
cd frontend && pnpm exec playwright test # e2e (needs both servers running)

# Combined (from root)
make test      # backend + frontend tests
make lint       # backend + frontend lint
```

### Styling

Visual theme is not finalized. Styling decisions deferred until core functionality is stable. Use minimal/default Tailwind styling during development. The previous project used a warm pink/rose palette (primary `#C0575A`, bg `#FDF6F0`, secondary bg `#F5E6E8`, text `#3D2C2C`, serif font) — this may or may not carry over.

---

## Core Parsing Logic (migrated from `food-delivery` repo)

All business logic lives in the backend. No UI framework imports in these modules.

### Menu Database (`data/menu.csv`)

Reference list of available food items. Updated manually when new items are added.

| Column         | Description                              | Example                              |
|----------------|------------------------------------------|--------------------------------------|
| `id`           | Auto-incremented integer                 | `1`                                  |
| `item_zh`      | Full Chinese name with unit spec         | `肉末香茹胡罗卜糯米烧卖15个/份`         |
| `item_short_zh`| Shortened Chinese name                   | `烧卖`                                |
| `item_en`      | Hanyu pinyin of short name               | `shao mai`                           |

Currently 31 items. `item_zh` is used for parser matching. `item_short_zh` used for label display.

### Raw WeChat Export Structure

The input is a `.xlsx` file exported from WeChat:

- Rows 0-2: WeChat metadata (skipped via `skiprows=3`)
- Row 3: Column headers (`序号, 姓名, 内容, 标签, 手机号码, 收货地址, 所在城市, 邮政编码`)
- Rows 4-N: Customer order records
- Blank row + `商品汇总` summary table at the end

Columns used (indices `[0,1,2,4,5,6,7]` — column 3 `标签` is skipped):

| Index | Chinese Header | Renamed To       |
|-------|---------------|------------------|
| 0     | 序号           | `delivery`       |
| 1     | 姓名           | `customer`       |
| 2     | 内容           | `items_ordered`  |
| 4     | 手机号码        | `phone_number`   |
| 5     | 收货地址        | `address`        |
| 6     | 所在城市        | `city`           |
| 7     | 邮政编码        | `zip_code`       |

### Summary Table Extraction (`read_summary_table`)

The `商品汇总` section lives at the bottom of the xlsx. Extraction:

1. Find the row where `序号 == '商品'` — this is the summary header
2. Read rows after it until `序号 == '总计'`
3. Each row: `序号` column = item name, `内容` column = total quantity (int)
4. Returns `{item_name: total_quantity}`

### Order Text Parsing (`process_excel`)

WeChat order text format:
```
肉末香茹胡罗卜糯米烧卖 15个/份x3， 荠菜鲜肉馄饨 50/份x2， 总价：$100.00
```

Parsing steps:
1. Split by `， ` (Chinese full-width comma + space)
2. Drop last segment (total price)
3. For each entry, `rsplit('x', 1)` to separate item name from quantity
4. Extract quantity via regex `(\d+)` on the right part
5. Match item name against `menu.csv` `item_zh` values:
   - Strip unit specs from `item_zh` via regex `\d+个?[/／]?份?$` to get base name
   - Remove all whitespace from both strings
   - Bidirectional substring match: `base_name in item_name_part` OR `item_name_part in base_name` (also checked with normalized/whitespace-stripped versions)
   - Break on first match
6. Unmatched items are silently dropped (caught by summary validation)

### Summary Validation (`validate_against_summary`)

After parsing all orders, each food item's column total is compared against the `商品汇总` table. Returns `[(food_item, parsed_total, expected_total)]` for mismatches. Items not present in the summary table (not ordered that batch) are skipped. Whitespace is normalized before comparison.

### Order Aggregation (`DeliveryOrderAnalyzer`)

- Identifies food columns as `df.columns[7:]` that contain Chinese characters (regex `[\u4e00-\u9fff]`)
- `analyze(selected_indices)`: sums food columns for selected rows, returns `[(item_name, total_qty)]` sorted by quantity descending, plus grand total
- Only includes items with quantity > 0

### Label PDF Generation (`labels.py`)

Generates Avery 5167 label sheets:

| Constant      | Value        |
|---------------|-------------|
| Label size    | 1.75" x 0.5"|
| Grid          | 4 cols x 20 rows = 80 labels/sheet |
| Left margin   | 0.3"        |
| Top margin    | 0.5"        |
| H gap         | 0.31"       |
| Font          | STSong-Light (CID font for Chinese), 8pt |

- Each label displays: `[id]  item_short_zh`
- One label per unit ordered (quantity 3 = 3 labels)
- Auto-paginates when exceeding 80 labels per page
- Uses `reportlab` with `UnicodeCIDFont` for Chinese character support
- Input: `sorted_items` from analyzer + `menu_df` from menu.csv
- Output: PDF bytes

---

## API Endpoints

| Method | Path              | Description                                                    | Phase |
|--------|-------------------|----------------------------------------------------------------|-------|
| POST   | `/upload`         | Accept xlsx file, parse orders, return orders + discrepancies  | 1     |
| POST   | `/analyze`        | Accept selected order indices, return sorted items + totals    | 2     |
| POST   | `/labels`         | Accept sorted items, return PDF bytes                          | 3     |
| GET    | `/menu`           | Return menu.csv contents                                       | 1     |

## Frontend Views

| View      | Description                                                                   | Phase |
|-----------|-------------------------------------------------------------------------------|-------|
| Login     | Password input, centered layout                                               | 1     |
| Upload    | File upload widget, process button, error display                             | 1     |
| Analyze   | Order table with click-and-drag multi-select, Select All / Clear All, analysis results (item list, summary metrics, bar chart, detailed report), CSV/report downloads | 2 |
| Labels    | Preview table of labels with quantities, PDF download button                  | 3     |
| Routing   | TBD                                                                           | 4     |

## Authentication

- Backend: environment variable for production, local config file for dev
- Timing-safe password comparison (`hmac.compare_digest`)
- Frontend: password input → validate against backend → store auth state

## Known Limitations (inherited)

- **Parser matching is substring-based** — a short food name could match multiple items. Mitigated by breaking on first hit.
- **Unmatched items are silently dropped** — new items not in `menu.csv` parse as 0. Summary validation surfaces this as a discrepancy.
