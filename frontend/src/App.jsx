import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MarketPage    from './pages/MarketPage';
import StockPage     from './pages/StockPage';
import PortfolioPage from './pages/PortfolioPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AlertsPage    from './pages/AlertsPage';
import ProfilePage   from './pages/ProfilePage';
import SettingsPage  from './pages/SettingsPage';
import NotFoundPage  from './pages/NotFoundPage';

const PrivateRoute = ({ children }) => {
  const token = useAuthStore(s => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index              element={<DashboardPage />} />
        <Route path="market"      element={<MarketPage />} />
        <Route path="market/:symbol" element={<StockPage />} />
        <Route path="portfolio"   element={<PortfolioPage />} />
        <Route path="analytics"   element={<AnalyticsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="alerts"      element={<AlertsPage />} />
        <Route path="profile"     element={<ProfilePage />} />
        <Route path="settings"    element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
