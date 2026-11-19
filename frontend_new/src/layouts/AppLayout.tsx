import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { BarChart3, Bot, Goal, LayoutDashboard, Menu, Settings, WalletCards, X, RefreshCcw, HeartPulse, Download } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n";
import { api } from "../services/api";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: WalletCards },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/goals", label: "Goals", icon: Goal },
  { to: "/ai", label: "AI Assistant", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/subscriptions", label: "Subscriptions", icon: RefreshCcw },
  { to: "/financial-health", label: "Financial Health", icon: HeartPulse },
  { to: "/exports", label: "Exports", icon: Download },
];

export default function AppLayout() {
  const { sidebarOpen, setSidebarOpen, notice, setNotice, setLanguage } = useAppStore();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice, setNotice]);

  useEffect(() => {
    api.get<{ language: "ru" | "en" | "kk"; theme: string }>("/settings")
      .then(({ data }) => {
        setLanguage(data.language);
        document.documentElement.dataset.theme = data.theme;
      })
      .catch(() => undefined);
  }, [setLanguage]);

  return (
    <div className="app-shell">
      <button className="mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label={t("Открыть меню")}>
        <Menu />
      </button>
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.button
              className="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              aria-label={t("Закрыть меню")}
            />
            <motion.aside
              className="sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="brand-row">
                <div className="brand-mark">P</div>
                <div><strong>Penny</strong><span>Finance OS</span></div>
                <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)}><X /></button>
              </div>
              <nav>
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={() => {
                    if (window.innerWidth < 900) setSidebarOpen(false);
                  }}>
                    {({ isActive }) => (
                      <>
                        <Icon size={19} />
                        <span>{t(label)}</span>
                        {isActive && <motion.span layoutId="active-nav" className="active-nav" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="sidebar-profile">
                <div className="avatar">U</div>
                <div><strong>{user?.name ?? "My Account"}</strong><span>{user?.email ?? "Personal workspace"}</span></div>
              </div>
              <div className="sidebar-actions">
                <NavLink to="/settings"><Settings size={17} /> {t("Настройки")}</NavLink>
                <button type="button" onClick={handleLogout}>{t("Выход")}</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="main-content">
        <Outlet />
      </main>
      <AnimatePresence>
        {notice && (
          <motion.div
            className={`toast ${notice.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {notice.text}
            <button type="button" onClick={() => setNotice(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
