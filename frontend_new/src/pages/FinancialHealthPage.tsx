import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useTranslation } from "../i18n";

type Health = {
  financial_score: number;
  savings_level: number;
  diversification: number;
  budget_quality: number;
  goal_progress: number;
  emergency_fund: number;
  emergency_progress: number;
  monthly_history: Array<{ month: string; score: number }>;
  recommendations: string[];
};

export default function FinancialHealthPage() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<Health | null>(null);
  const [achievements, setAchievements] = useState<Array<{ code: string; name: string; description: string; earned: boolean }>>([]);
  useEffect(() => {
    Promise.all([api.get<Health>("/financial-health"), api.get("/achievements")])
      .then(([healthResponse, achievementsResponse]) => { setHealth(healthResponse.data); setAchievements(achievementsResponse.data); })
      .catch(() => undefined);
  }, []);
  if (!health) return <div className="page"><div className="empty-state panel">{t("Загрузка финансового здоровья...")}</div></div>;

  const metrics = [
    [t("Уровень сбережений"), health.savings_level],
    [t("Диверсификация расходов"), health.diversification],
    [t("Качество бюджета"), health.budget_quality],
    [t("Прогресс целей"), health.goal_progress],
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("FINANCIAL WELLNESS")}</p><h1>{t("Financial Health")}</h1></div></header>
      <section className="health-grid">
        <article className="panel score-card"><p className="eyebrow">{t("ФИНАНСОВЫЙ РЕЙТИНГ")}</p><motion.strong initial={{ scale: 0.7 }} animate={{ scale: 1 }}>{health.financial_score}</motion.strong><span>{t("из 100")}</span><div className="score-track"><motion.div initial={{ width: 0 }} animate={{ width: `${health.financial_score}%` }} /></div></article>
        <article className="panel emergency-card"><p className="eyebrow">{t("ПОДУШКА БЕЗОПАСНОСТИ")}</p><h2>{health.emergency_fund.toLocaleString()} ₸</h2><div className="goal-track"><motion.div initial={{ width: 0 }} animate={{ width: `${health.emergency_progress}%` }} /></div><span>{health.emergency_progress.toFixed(0)}% {t("сформировано")} · {t("рекомендуемые 6 месяцев расходов")}</span></article>
      </section>
      <section className="metric-grid health-metrics">{metrics.map(([label, value]) => <article className="metric-card" key={String(label)}><span>{label}</span><strong>{Number(value).toFixed(0)}%</strong><div className="goal-track"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} /></div></article>)}</section>
      <section className="split-grid">
        <article className="panel"><h2>{t("AI рекомендации")}</h2>{health.recommendations.map((item) => <div className="recommendation" key={item}>{item}</div>)}</article>
        <article className="panel"><h2>{t("Достижения")}</h2><div className="badges">{achievements.map((item) => <motion.div className={item.earned ? "badge earned" : "badge"} key={item.code} whileHover={{ y: -4 }}><strong>{t(item.name)}</strong><span>{t(item.description)}</span></motion.div>)}</div></article>
      </section>
    </motion.div>
  );
}
