# CCVI Local Data Dashboard

A local-first data visualization dashboard for exploring CCVI, climate risk, conflict risk, and vulnerability data. The application combines a React/Vite frontend with a local Express API that queries a large Parquet dataset through DuckDB.

## Overview

This project is intended for local exploration of climate-conflict-vulnerability index data. It helps users inspect spatial patterns, compare metrics across countries and continents, and explore summary statistics and indicator-level trends over time.

The dashboard is useful for developers, students, evaluators, and analysts who need to understand CCVI-related data interactively without loading the entire raw dataset into the browser. The current architecture is local-first: the browser talks to a local API, and the API reads `data/scores.parquet` with DuckDB.

## Data Source

The tool uses CCVI data from the Climate Conflict Vulnerability Index project:

```text
https://climate-conflict.org/www/latest-data/full/
```

In this repository, the working dataset is stored locally as `data/scores.parquet`. The dataset includes geography, time period fields, CCVI scores, climate risk indicators, conflict risk indicators, vulnerability indicators, and sub-indicator columns used by the map, statistics, and radar views.

The CCVI data is licensed under the Creative Commons Attribution-NonCommercial 4.0 International license:

```text
https://creativecommons.org/licenses/by-nc/4.0/
```

## Features

- Interactive dashboard with Map, Stats, and Radar tabs.
- Global, continent, and country-level filtering through a persistent filter panel.
- Quarter and year-based time filtering.
- Metric selection for CCVI, Climate Risk, Conflict Risk, and Vulnerability.
- MapLibre-based point map for geographic exploration.
- D3-based statistical visualizations:
  - Summary statistics table.
  - Distribution by continent.
  - Country score beeswarm plot.
  - Metric correlation heatmap.
  - Radar chart for component and sub-index comparison.
- Local Express API endpoints for map metadata, map data, statistical summaries, and radar data.
- DuckDB-backed querying over a Parquet dataset instead of loading the full dataset directly in React.
- Plain CSS dashboard layout with responsive behavior for narrower screens.

## Tech Stack

- React 19
- TypeScript
- Vite
- npm
- Express 5
- DuckDB Node API (`@duckdb/node-api`)
- D3
- MapLibre GL
- Zod for API query validation
- ESLint with TypeScript and React Hooks rules
- Git LFS for Parquet dataset tracking

No Tailwind CSS, CSS modules, Observable Plot, or deployment-specific tooling is currently configured.

## File Organization

```text
.
├── data/
│   └── scores.parquet          # Main analytical dataset, tracked with Git LFS
├── public/
│   └── vite.svg                # Static public asset from the Vite template
├── server/
│   ├── index.ts                # Local Express API server
│   ├── query/
│   │   ├── duckdbClient.ts     # DuckDB connection and query helper
│   │   ├── mapQueryService.ts  # Map metadata and map feature queries
│   │   ├── radarQueryService.ts
│   │   ├── statsQueryService.ts
│   │   └── sql.ts              # SQL builders and map query constants
│   └── types/
│       └── mapApi.ts           # Server-side API types
├── src/
│   ├── components/
│   │   ├── layout/             # Dashboard shell, tabs, and filters panel
│   │   ├── map/                # MapLibre map, legend, and popup components
│   │   ├── stats/              # Statistical D3 visualizations
│   │   └── tabs/               # Map, Stats, and Radar tab views
│   ├── config/
│   │   └── mapMetrics.ts       # Display configuration for dashboard metrics
│   ├── hooks/                  # Data-fetching and interaction hooks
│   ├── pages/                  # Main dashboard page and CSS
│   ├── services/               # Browser API clients
│   ├── state/                  # Filter context and state helpers
│   ├── types/                  # Shared frontend data types
│   └── utils/                  # Map color scales and GeoJSON conversion
├── .gitattributes              # Git LFS rule for *.parquet files
├── eslint.config.js
├── package.json
├── tsconfig*.json
└── vite.config.ts              # Vite config and /api proxy to local server
```

## Data

The application uses `data/scores.parquet` as its main dataset. In this checkout the file is approximately 659 MB.

The dataset is read by the local Express API, not directly by the browser:

- `server/query/duckdbClient.ts` resolves `data/scores.parquet` and creates an in-memory DuckDB connection.
- API query services build SQL statements and call DuckDB.
- Frontend services in `src/services/` fetch JSON from local `/api/...` endpoints.
- Vite proxies `/api` requests to `http://127.0.0.1:4000` during development.

The repository tracks Parquet files with Git LFS:

```bash
sudo apt install git-lfs
git lfs install
git lfs pull
```

Without Git LFS, `data/scores.parquet` may be a small pointer file instead of the real dataset. If that happens, DuckDB queries will fail or return errors because the Parquet file is not actually present.

No preprocessing scripts are currently included in the repository. The app expects the Parquet file to exist at `data/scores.parquet` before the local API starts serving data-dependent routes.

Large data is a core constraint of this project. Some queries scan many rows and may take noticeable time, especially on first load when DuckDB initializes and metadata/domain queries are warmed.

The project avoids loading the full Parquet file directly in the browser by querying it through a local API. Even so, large analytical data can still be expensive:

- First load may be slower while DuckDB initializes and metadata queries run.
- Queries over the full dataset can be CPU and memory intensive.
- Map responses are limited or aggregated in server-side SQL to reduce frontend rendering load.
- Development mode may appear responsive while production previews or constrained environments struggle if the API or dataset is missing.
- Static hosting is not ideal for this kind of dataset unless the data is optimized first.

Realistic improvements for larger or shared deployments include precomputing smaller slices, splitting data by year or geography, lazy-loading only the current view, caching expensive DuckDB results, and exposing reduced JSON to the browser instead of raw analytical data.

## Getting Started

### Prerequisites

- Node.js 20 or newer is recommended. The repository does not currently declare an exact Node engine.
- npm, using the committed `package-lock.json`.
- Git LFS, required for the Parquet dataset.

### Optional Environment Isolation

This is a Node.js project, so it does not use a Python virtual environment. If you want an isolated runtime, use a Node version manager such as `nvm`:

```bash
nvm install 20
nvm use 20
```

### Setup

```bash
git clone <repository-url>
cd <project-folder>
sudo apt install git-lfs
git lfs install
git lfs pull
npm install
npm run dev
```
Setup from `.zip` file can be done just like this:
```bash
npm install
npm run dev
```

The development app is served by Vite at:

```text
http://localhost:5173
```

The local API server listens on:

```text
http://127.0.0.1:4000
```

`npm run dev` starts both the API server and Vite client through `concurrently`.

## Typical Usage

1. Start the app with `npm run dev`.
2. Open `http://localhost:5173`.
3. Use the right-side filter panel to choose geography, period mode, year or quarter, and the active metric.
4. Use the Map tab to inspect spatial point patterns for the selected metric and period.
5. Use the Stats tab to compare summary statistics, continent distributions, country scores, and metric correlations.
6. Use the Radar tab to compare countries across CCVI components or sub-indicator groups.
7. Change filters and tabs iteratively to compare how risk patterns vary by time, geography, and metric.

## Available Scripts

```bash
npm run dev
```

Starts both local processes: `npm run dev:server` and `npm run dev:client`.

```bash
npm run dev:client
```

Starts the Vite development server.

```bash
npm run dev:server
```

Starts the Express API server with Node watch mode and `tsx`.

```bash
npm run build
```

Runs TypeScript project build checks and creates a production Vite build.

```bash
npm run lint
```

Runs ESLint across the repository.

```bash
npm run preview
```

Serves the built frontend locally with Vite preview. This does not replace the local API server; data-backed `/api` routes still require the Express server to be running separately.

## Local Build

Create a local production build:

```bash
npm run build
```

Preview the built frontend locally:

```bash
npm run preview
```

A successful local build confirms that TypeScript and Vite bundling completed. It does not mean the project is suitable for static deployment with the full dataset. The dashboard depends on local API routes and a large Parquet file; hosting the frontend alone will not provide the DuckDB-backed data endpoints.

## Troubleshooting

### `npm run dev` works but `npm run build` fails

Development mode can be more forgiving than the production build. The build runs TypeScript project checks and Vite bundling, which can expose issues such as:

- TypeScript errors.
- Incorrect imports.
- Missing files.
- Case-sensitive path mismatches.
- Large or unsupported assets.
- Git LFS pointer files instead of real data files.
- Build output warnings about bundle size.

Run:

```bash
npm run build
```

Then fix the first reported TypeScript or bundling error before moving to later warnings.

### Data does not load locally

Check the following:

- `data/scores.parquet` exists.
- The file is the real Parquet dataset, not a Git LFS pointer file.
- Git LFS has been initialized and pulled:

  ```bash
  git lfs install
  git lfs pull
  ```

- The API server is running on `http://127.0.0.1:4000`.
- The Vite dev server is running on `http://localhost:5173`.
- Browser network requests to `/api/...` are not returning 404 or 500.
- The terminal running `npm run dev:server` does not show DuckDB or file path errors.

### Data loading is very slow

Check:

- Dataset size and whether the query scans most of `data/scores.parquet`.
- Whether filters are broad, such as all countries and all continents.
- Whether repeated UI interactions trigger repeated expensive queries.
- Whether the current view can use pre-aggregated data.
- Whether slow work is happening in React render code instead of in API/query services.

Large-file latency is a project constraint, not necessarily a bug.

### Map background or tiles do not appear

The map component uses MapLibre with the demo style URL from `https://demotiles.maplibre.org/style.json`. The analytical data is local, but the base map style and tiles may require network access. If the base map fails but points still load, check browser network errors for the MapLibre style or tile requests.

## Development Guidelines

- Keep visualization logic separated from data-loading logic.
- Centralize data access through `src/services/` and server query services.
- Keep reusable UI components small and focused.
- Use typed data models for API responses and dataset-derived objects.
- Avoid loading raw analytical data directly inside React components.
- Keep transformation functions testable and independent from React when possible.
- Prefer clear names for indicators, sub-indices, and derived metrics.
- Avoid hardcoded magic values where shared configuration would be clearer.
- Treat large data behavior as part of the architecture, not as an afterthought.
- Run build and targeted lint checks before committing changes.

## Known Limitations

- The main dataset is large and may be slow to query on some machines.
- The app depends on `data/scores.parquet` being available locally.
- Git LFS is required to retrieve the full Parquet dataset from a fresh clone.
- Browser-based rendering can still become expensive when many points or chart marks are returned.
- Static deployment is not recommended without data optimization and an API/query strategy.
- `npm run preview` only previews the frontend build; it does not start the Express API server.
- The repository does not currently include automated tests or preprocessing scripts.

## Acknowledgments and References

This project builds on several open-source tools and libraries:

- React and React DOM for the frontend UI.
- Vite for the development server and frontend build tooling.
- TypeScript for static typing.
- Express for the local API server.
- DuckDB and `@duckdb/node-api` for local analytical queries over Parquet data.
- D3 for statistical charts and custom SVG visualizations.
- MapLibre GL for the interactive map.
- Zod for API query validation.
- ESLint and TypeScript ESLint for code quality checks.
- Climate Conflict Vulnerability Index data from `https://climate-conflict.org/www/latest-data/full/`.

## License

The CCVI data used by this project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International license:

```text
https://creativecommons.org/licenses/by-nc/4.0/
```