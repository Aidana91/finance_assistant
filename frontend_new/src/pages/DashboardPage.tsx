import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Bot, Plus, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { CardSkeleton, PanelSkeleton } from "../components/Skeleton";
import { api } from "../services/api";
import type { AnalyticsData, Transaction } from "../types";
import { useTranslation } from "../i18n";

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Transaction[]>("/transactions"),
      api.get<AnalyticsData>("/analytics"),
    ]).then(([tx, ana]) => {
      setTransactions(tx.data);
      setAnalytics(ana.data);
    }).finally(() => setLoading(false));

    api.get<{ analysis: string }>("/ai/analyze")
      .then(({ data }) => setAnalysis(data.analysis))
      .catch(() => setAnalysis(t("Запустите Ollama, чтобы получить персональные рекомендации по вашим данным.")));
  }, []);

  const current = analytics?.current_month;
  const topCategory = analytics?.top_categories[0];
  const recent = transactions.slice(0, 8);
  const greeting = t(new Date().getHours() < 12 ? "Доброе утро" : new Date().getHours() < 18 ? "Добрый день" : "Добрый вечер");
  const change = (value: number) => (
    <small className={value <= 0 ? "positive" : "negative"}>
      {value <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
      {Math.abs(value).toFixed(1)}% {t("к прошлому месяцу")}
    </small>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="page">
      <header className="page-header">
        <div><p className="eyebrow">{t("ФИНАНСОВЫЙ ОБЗОР")}</p><h1>{greeting}</h1></div>
        <Link className="primary-button" to="/transactions"><Plus size={18} /> {t("Добавить операцию")}</Link>
      </header>

      <motion.section className="metric-grid" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {loading ? <><CardSkeleton /><CardSkeleton /><CardSkeleton /></> : (
          <>
            <motion.article className="metric-card balance-card" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <div className="metric-label"><span>{t("Текущий баланс")}</span><Wallet size={18} /></div>
              <strong>{current?.balance.toLocaleString(language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU") ?? 0} ₸</strong>
              {change(current?.expense_change ?? 0)}
            </motion.article>
            <motion.article className="metric-card" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <div className="metric-label"><span>{t("Доход за месяц")}</span><TrendingUp size={18} /></div>
              <strong className="positive">{current?.income.toLocaleString("ru-RU") ?? 0} ₸</strong>
              {change(current?.income_change ?? 0)}
            </motion.article>
            <motion.article className="metric-card" variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <div className="metric-label"><span>{t("Расход за месяц")}</span><TrendingUp size={18} /></div>
              <strong className="negative">{current?.expenses.toLocaleString("ru-RU") ?? 0} ₸</strong>
              {change(current?.expense_change ?? 0)}
            </motion.article>
          </>
        )}
      </motion.section>

      <section className="dashboard-grid">
        {loading ? <PanelSkeleton /> : (
          <motion.article className="panel recent-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-heading"><div><p className="eyebrow">{t("АКТИВНОСТЬ")}</p><h2>{t("Последние операции")}</h2></div><Link to="/transactions">{t("Все операции")}</Link></div>
            {recent.length ? <div className="transaction-list">{recent.map((item, index) => (
              <motion.div className="transaction-row" key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
                <div className="category-icon">{item.category.slice(0, 1).toUpperCase()}</div>
                <div><strong>{item.category}</strong><span>{item.date}{item.comment ? ` · ${item.comment}` : ""}</span></div>
                <b className={item.type === "income" ? "positive" : "negative"}>{item.type === "income" ? "+" : "-"}{item.amount.toLocaleString("ru-RU")} ₸</b>
              </motion.div>
            ))}</div> : <div className="empty-state"><span>{t("Операций пока нет")}</span><Link to="/transactions">{t("Добавить первую")}</Link></div>}
          </motion.article>
        )}

        <motion.article className="panel ai-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <div className="ai-icon"><Bot /></div>
          <p className="eyebrow">{t("AI РЕКОМЕНДАЦИЯ")}</p>
          <h2>{t("Финансовый анализ")}</h2>
          <p>{analysis || t("Анализируем ваши финансы...")}</p>
          {topCategory && <div className="mini-insight"><span>{t("Главная категория расходов")}</span><strong>{topCategory.name}</strong><b>{topCategory.value.toLocaleString()} ₸</b></div>}
          <Link to="/ai">{t("Открыть помощника")}</Link>
        </motion.article>
      </section>
    </motion.div>
  );
}
