[pipboy-maps-README.md](https://github.com/user-attachments/files/26942352/pipboy-maps-README.md)
# ◧ PIP-BOY 3000 MAPS

<p align="center">
  <img src="https://haytako.github.io/pipboy-maps/favicon.svg" alt="Pip-Boy Maps" width="120">
</p>

<p align="center">
  <strong>Fallout-style offline-ready map in your browser</strong><br>
  <a href="https://haytako.github.io/pipboy-maps/">🌐 Live Demo</a>
</p>

---

## What is this?

A web app styled like the iconic **PIP-BOY 3000** interface from Fallout. Full-featured interactive map with markers, routes, measurements, and offline tile caching — all in the classic green CRT aesthetic.

No server required. Runs entirely in the browser. Works as a PWA — install it on your phone and use it like a native app.

## ✨ Features

- **🗺 Interactive Map** — Leaflet-based with multiple tile layers (street, satellite, dark)
- **📌 Markers** — Drop pins, name them, categorize by color
- **📐 Distance Measurement** — Measure distances directly on the map
- **✏️ Drawing** — Freehand draw on the map
- **🚂 Transport Schedules** — Built-in timetables for Antwerp, Brussels, Moscow, Balashikha
- **💾 Offline Mode** — Download map tiles via Service Worker for use without internet
- **📱 PWA** — Add to home screen, works like a native app
- **🌐 Bilingual** — Russian / English interface
- **💾 Persistent Storage** — All data saved to localStorage

## 🛠 Tech Stack

| Tech | Purpose |
|------|---------|
| [Next.js 16](https://nextjs.org/) | React framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Leaflet](https://leafletjs.com/) | Interactive maps |
| [Zustand](https://zustand.docs.pmnd.rs/) | State management |
| [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) | Offline caching |

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/haytako/pipboy-maps.git
cd pipboy-maps

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build for GitHub Pages

```bash
npm run build
```

The `out/` folder contains the static export ready for deployment.

## 📱 Install as App

1. Open the [live demo](https://haytako.github.io/pipboy-maps/) on your phone
2. Tap "Add to Home Screen" (Safari) or "Install" (Chrome)
3. Use it like a native app — even works offline with preloaded tiles!

## 📸 Preview

> Classic green-on-black CRT display with scanline effect
> Pip-Boy boot animation on load
> Responsive design — works on desktop and mobile

---

<p align="center">
  Made by <strong>Sandalf Studio</strong> · <a href="https://github.com/haytako/pipboy-maps/issues">Report a bug</a> · ⭐ Star if you like it!
</p>
