# God Eyes Explorer

God Eyes Explorer is a premium, cinematic 3D Earth intelligence platform built for the browser. It provides a real-time, highly polished "God's Eye" view of the world by combining smooth globe navigation with live, dynamic intelligence layers.

---

## ðŸŒ What We Are Making
We are building a 3D Earth explorer that goes beyond a standard map. It features:
- **Immersive 3D Navigation**: Smooth zooming, panning, and target-centered camera orbiting.
- **Cinematic Visuals**: High-resolution imagery, accurate 3D terrain, and OSM 3D buildings.
- **Live Intelligence Layers**: A real-time flight tracking system (with plans for ships, satellites, and global events).
- **Control-First UI**: A sleek, glassmorphic HUD sidebar that gives the user total control over visual layers, environment settings, and intelligence feeds.

## ðŸŽ¯ Why We Are Making It
The goal is to create a deeply engaging, interactive experience that feels like operating a premium global intelligence terminal. 
We wanted a globe that prioritizes performance and cinematic aesthetics while delivering real-world, real-time data seamlessly. It is designed to be a foundation for visualizing complex geospatial dataâ€”starting with flights, but eventually scaling to a full spectrum of global activity.

## ðŸ›  How We Are Making It
God Eyes Explorer is built on a modern, high-performance web stack:
- **Frontend Framework**: React, TypeScript, and Vite.
- **3D Globe Engine**: [CesiumJS](https://cesium.com/) (integrated via `Resium`).
- **Live Data**: The [OpenSky Network API](https://opensky-network.org/) provides real-time state vectors for global flights.
- **Backend/Proxy**: A lightweight, local Node.js proxy (`server/flights-proxy.mjs`) handles OpenSky API authentication, mitigates rate limits, caches snapshots, and stabilizes the flight feed so planes don't abruptly disappear during transient network failures.

## âœ¨ Current Features
- **Terrain & Buildings**: Real-world elevation and extruded OSM 3D buildings that ground perfectly on the terrain.
- **Advanced Search**: Custom geocoder integration with intelligent query ranking.
- **Orbit Camera**: A target-centered cinematic orbit that allows you to lock onto landmarks.
- **Live Flight Tracking**: 
  - Zoom-based level of detail (dots from afar, directional plane icons up close).
  - Selected flight details panel with real-time speed, heading, and altitude.
  - Custom **Focus** and **Track** camera actions that follow the selected aircraft while preserving your viewing angle.

## ðŸš€ Getting Started

### Prerequisites
- Node.js (v18+)
- OpenSky Network account (optional, but recommended for better rate limits)

### Installation
1. Clone the repository and navigate to the explorer directory:
   ```bash
   cd explorer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and add your OpenSky credentials if you have them.

### Running Locally
You need to run both the frontend and the local flight proxy.

**Terminal 1 (Flight Proxy):**
```bash
npm run dev:flights
```

**Terminal 2 (Frontend App):**
```bash
npm run dev
```

Open `http://localhost:5174` in your browser to view the application.


---

## Source: explorer\database\README.md

# Database

This folder contains database design and migration artifacts only.

Use one PostgreSQL database with PostGIS and TimescaleDB extensions:

```txt
god_eyes
```

Do not store normalized JSONL, Parquet, raster, or raw fetched data inside this folder.

Folder layout:

```txt
postgres/migrations/  SQL migrations
postgres/seeds/       seed source and parameter registry data
docs/                 database architecture notes
```

Storage stack:

```txt
recent/current time series -> PostgreSQL + TimescaleDB hypertables
geospatial records         -> PostGIS
old detailed history       -> Parquet
large archive queries      -> DuckDB over Parquet
huge grids/rasters         -> Parquet / COG / Zarr
```


---

## Source: explorer\normalization\weather\README.md

# Weather Normalization

Weather normalization code lives here.

Flow:

```txt
data_raw/weather/
  fetch_log.jsonl + metadata sidecars + raw files

normalization/weather/
  source-specific normalizers and shared time/unit/location logic

data_normalized/weather/
  temporary JSONL outputs before PostgreSQL insert

PostgreSQL/PostGIS god_eyes
  normalized tables

data_processed/weather/
  Parquet, COG, Zarr, and other large processed products
```

The first normalized layer is `source_raw_files`, because every later normalized record needs raw lineage.

Do not write normalized data into `explorer/database`.

