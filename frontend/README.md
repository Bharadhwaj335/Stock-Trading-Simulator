# 💻 StockSim Frontend Interface

An immersive, premium-grade dashboard for virtual stock analysis and paper trading. Built as a fully responsive cyberpunk interface with a dynamic dark/light theme engine, the application connects dynamically to backend servers and web socket endpoints for real-time tickers and market execution.

---

## 🛠️ Technology Stack
- **Framework**: React.js (Vite)
- **Styling**: Vanilla CSS + TailwindCSS (for precise glassmorphic controls)
- **State Management**: Zustand
- **Asynchronous Data Queries**: React Query
- **Charts Integration**: TradingView Lightweight Charts + Recharts
- **Production Host**: Vercel (supporting client-side SPA routing fallback)

---

## 📂 Frontend File Structure

```text
frontend/
├── vercel.json              # Custom Vercel routing fallback configuration
├── src/
│   ├── App.jsx              # Main App shell and route mappings
│   ├── main.jsx             # App bootstrapper wrapped in global Error Boundary
│   ├── components/
│   │   ├── charts/          # Interactive Candlestick charts & Sector Allocation pies
│   │   ├── layout/          # Global layout structure, responsive navigation sidebar
│   │   └── ui/              # Stylized Error Boundaries, Spotlights, and Alert modals
│   ├── hooks/               # Custom hooks for Socket connectivity
│   ├── pages/               # Functional pages (Dashboard, StockDetails, Leaderboard)
│   ├── services/            # Axios API client integrations
│   ├── store/               # Zustand global state (Auth status, Wallet parameters)
│   └── index.css            # Stylesheets, animations, and color overrides
└── package.json             # Core dependency packages
```

---

## 🚀 Running Locally & Commands

To launch the frontend client:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Setup**:
   Create a `.env` file mapping `VITE_API_URL` to your backend API URL (e.g. `http://localhost:5000/api`).
3. **Scripts**:
   - Run in Development:
     ```bash
     npm run dev
     ```
   - Compile for Production:
     ```bash
     npm run build
     ```
   - Preview local production build:
     ```bash
     npm run preview
     ```

---

## ✨ Features Spotlight

### 📊 Real-Time Interactive Charts
Renders high-performance TradingView **Lightweight Charts** to display live historical stock candlestick feeds with responsive ResizeObservers, ensuring visual layouts adapt fluidly across devices.

### 🎨 Premium Interface Color Themes
Includes four custom-themed interface overrides that can be swapped instantly inside settings:
- **Cyber Slate**: Cyberpunk dark theme with highlighted emerald green accents.
- **Neon Sunset**: Energetic pink/rose theme matching premium dark styles.
- **Ocean Slate**: Clean sky blue tech aesthetics.
- **Light Slate**: High-contrast professional light theme mapping crisp card surfaces, custom scrollbars, and high-readability chart lines.

### 🛡️ Cyberpunk Error Boundary
Uses a client-side React **ErrorBoundary** component. In the event of a runtime rendering crash, rather than showing a blank screen, it displays a premium terminal crash interface with an active error log trace and direct reboot controls.
