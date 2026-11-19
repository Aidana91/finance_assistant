import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { useAuthStore } from "./store/authStore";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const AIPage = lazy(() => import("./pages/AIPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const FinancialHealthPage = lazy(() => import("./pages/FinancialHealthPage"));
const ExportsPage = lazy(() => import("./pages/ExportsPage"));

export default function App() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) void loadUser();
  }, [loadUser, token]);

  return (
    <Suspense fallback={<div className="page-loading">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/financial-health" element={<FinancialHealthPage />} />
            <Route path="/exports" element={<ExportsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
