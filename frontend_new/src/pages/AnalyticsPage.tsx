import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelSkeleton } from "../components/Skeleton";
import { api } from "../services/api";
import type { AnalyticsData } from "../types";
import { useTranslation } from "../i18n";

const colors = ["#3B82F6", "#22C55E", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsData>("/analytics")
      .then(({ data }) => setAnalytics(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><header className="page-header"><div><p className="eyebrow">{t("ИНСАЙТЫ")}</p><h1>{t("Аналитика")}</h1></div></header><section className="analytics-grid"><PanelSkeleton /><PanelSkeleton /></section></div>;
  if (!analytics) return <div className="page"><div className="empty-state panel">{t("Не удалось загрузить аналитику")}</div></div>;

  const categoryData = Object.entries(analytics.expenses_by_category).map(([name, value]) => ({ name, value }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("ИНСАЙТЫ")}</p><h1>{t("Аналитика")}</h1></div></header>
      <section className="metric-grid analytics-metrics">
        <motion.article className="metric-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><span>{t("Средний расход в день")}</span><strong>{analytics.average_daily_expense.toLocaleString()} ₸</strong></motion.article>
        <motion.article className="metric-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}><span>{t("Прогноз расходов")}</span><strong>{analytics.forecast_expenses.toLocaleString()} ₸</strong></motion.article>
        <motion.article className="metric-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><span>{t("Самая затратная категория")}</span><strong className="negative">{analytics.top_categories[0]?.name ?? t("Нет расходов")}</strong></motion.article>
      </section>
      <section className="analytics-grid">
        <motion.article className="panel chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><h2>{t("Расходы по категориям")}</h2>{categoryData.length ? <ResponsiveContainer width="100%" height={290}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={3}>{categoryData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="empty-state">{t("Расходов пока нет")}</div>}</motion.article>
        <motion.article className="panel chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}><h2>{t("Расходы по месяцам")}</h2><ResponsiveContainer width="100%" height={290}><BarChart data={analytics.monthly_expenses}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="month" stroke="#94A3B8" /><YAxis stroke="#94A3B8" /><Tooltip /><Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></motion.article>
        <motion.article className="panel chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><h2>{t("Сравнение доходов и расходов")}</h2><ResponsiveContainer width="100%" height={290}><BarChart data={analytics.monthly_comparison}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="month" stroke="#94A3B8" /><YAxis stroke="#94A3B8" /><Tooltip /><Bar dataKey="income" fill="#22C55E" radius={[5, 5, 0, 0]} /><Bar dataKey="expenses" fill="#EF4444" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></motion.article>
        <motion.article className="panel chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}><h2>{t("Баланс по времени")}</h2><ResponsiveContainer width="100%" height={290}><LineChart data={analytics.balance_over_time}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="month" stroke="#94A3B8" /><YAxis stroke="#94A3B8" /><Tooltip /><Line type="monotone" dataKey="balance" stroke="#22C55E" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></motion.article>
        <motion.article className="panel top-categories wide-chart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><h2>{t("Самые затратные категории")}</h2>{analytics.top_categories.map((item, index) => <div className="category-line" key={item.name}><span className="rank">{index + 1}</span><div><strong>{item.name}</strong><div className="category-track"><div style={{ width: `${analytics.expenses ? item.value / analytics.expenses * 100 : 0}%` }} /></div></div><b>{item.value.toLocaleString()} ₸</b></div>)}</motion.article>
      </section>
    </motion.div>
  );
}
