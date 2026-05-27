import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import LandingPage       from './pages/LandingPage';
import DashboardPage     from './pages/DashboardPage';
import MarketPage        from './pages/MarketPage';
import StockPage         from './pages/StockPage';
import PortfolioPage     from './pages/PortfolioPage';
import WatchlistPage     from './pages/WatchlistPage';
import NewsPage          from './pages/NewsPage';
import AnalyticsPage     from './pages/AnalyticsPage';
import LeaderboardPage   from './pages/LeaderboardPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AlertsPage        from './pages/AlertsPage';
import ProfilePage       from './pages/ProfilePage';
import SettingsPage      from './pages/SettingsPage';
import NotFoundPage      from './pages/NotFoundPage';

export default function App() {
  const token = useAuthStore(s => s.accessToken);
  const hasHydrated = useAuthStore(s => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-sans font-bold text-xs uppercase tracking-widest select-none">
        Initializing terminal session...
      </div>
    );
  }

  return (
    <Routes>
      {/* Root Route Handler: If logged in, wrap under AppLayout sidebar dashboard. If not, show public marketing LandingPage */}
      <Route path="/" element={token ? <AppLayout /> : <LandingPage />}>
        <Route index              element={<DashboardPage />} />
        <Route path="market"      element={<MarketPage />} />
        <Route path="market/:symbol" element={<StockPage />} />
        <Route path="portfolio"   element={<PortfolioPage />} />
        <Route path="watchlist"   element={<WatchlistPage />} />
        <Route path="news"        element={<NewsPage />} />
        <Route path="analytics"   element={<AnalyticsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="traders/:username" element={<PublicProfilePage />} />
        <Route path="alerts"      element={<AlertsPage />} />
        <Route path="profile"     element={<ProfilePage />} />
        <Route path="settings"    element={<SettingsPage />} />
      </Route>

      {/* Auth Redirects: If logged in, block access to auth forms and redirect home */}
      <Route path="/login"    element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />
      
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
