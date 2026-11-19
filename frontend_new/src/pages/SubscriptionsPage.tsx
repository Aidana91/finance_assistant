import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { useAppStore } from "../store/appStore";
import { useTranslation } from "../i18n";

type Subscription = { id: number; name: string; amount: number; next_payment_date: string; category: string; active: number };
type Recurring = { id: number; name: string; type: "income" | "expense"; category: string; amount: number; frequency: string; next_date: string; active: number };

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [reminders, setReminders] = useState<Array<{ id: number; name: string; amount: number; days_left: number }>>([]);
  const [subForm, setSubForm] = useState({ name: "", amount: "", payment_date: "", next_payment_date: "" });
  const [recForm, setRecForm] = useState({ name: "", type: "expense", category: "", amount: "", frequency: "monthly", next_date: "" });
  const { setNotice } = useAppStore();

  async function load() {
    const [subs, rec, due] = await Promise.all([api.get<Subscription[]>("/subscriptions"), api.get<Recurring[]>("/recurring"), api.get("/subscriptions/reminders")]);
    setSubscriptions(subs.data); setRecurring(rec.data); setReminders(due.data);
  }
  useEffect(() => { load().catch((error) => setNotice({ type: "error", text: error.message })); }, []);

  async function addSubscription(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/subscriptions", { ...subForm, amount: Number(subForm.amount) });
      setSubForm({ name: "", amount: "", payment_date: "", next_payment_date: "" });
      setNotice({ type: "success", text: t("Подписка добавлена") });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  async function addRecurring(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/recurring", { ...recForm, amount: Number(recForm.amount) });
      setRecForm({ name: "", type: "expense", category: "", amount: "", frequency: "monthly", next_date: "" });
      setNotice({ type: "success", text: t("Регулярная операция добавлена") });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  async function removeSubscription(id: number) {
    await api.delete(`/subscriptions/${id}`);
    await load();
  }

  async function removeRecurring(id: number) {
    await api.delete(`/recurring/${id}`);
    await load();
  }

  async function processRecurring() {
    try {
      const { data } = await api.post<{ created: number }>("/recurring/process");
      setNotice({ type: "success", text: `${t("Создано операций:")} ${data.created}` });
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("PAYMENTS")}</p><h1>{t("Subscriptions")}</h1></div><button className="primary-button" type="button" onClick={processRecurring}>{t("Обработать регулярные")}</button></header>
      {reminders.length > 0 && <section className="reminder-banner"><Bell size={20} /><div><strong>{t("Скоро списание")}</strong>{reminders.map((item) => <span key={item.id}>{item.name}: {item.amount.toLocaleString()} ₸ · {t("через")} {item.days_left} {t("дн.")}</span>)}</div></section>}
      <section className="split-grid">
        <article className="panel"><h2>{t("Добавить подписку")}</h2><form className="form-grid" onSubmit={addSubscription}>
          <label className="full-field">{t("Название")}<input value={subForm.name} onChange={(event) => setSubForm({ ...subForm, name: event.target.value })} required /></label>
          <label>{t("Сумма")}<input type="number" min="0.01" step="0.01" value={subForm.amount} onChange={(event) => setSubForm({ ...subForm, amount: event.target.value })} required /></label>
          <label>{t("Дата оплаты")}<input type="date" value={subForm.payment_date} onChange={(event) => setSubForm({ ...subForm, payment_date: event.target.value })} required /></label>
          <label className="full-field">{t("Следующее списание")}<input type="date" value={subForm.next_payment_date} onChange={(event) => setSubForm({ ...subForm, next_payment_date: event.target.value })} required /></label>
          <button className="primary-button full-field" type="submit"><Plus size={17} />{t("Добавить подписку")}</button>
        </form></article>
        <article className="panel"><h2>{t("Активные подписки")}</h2>{subscriptions.length ? subscriptions.map((item) => <div className="list-row" key={item.id}><div><strong>{item.name}</strong><span>{item.next_payment_date}</span></div><b>{item.amount.toLocaleString()} ₸</b><button type="button" onClick={() => removeSubscription(item.id)}><Trash2 size={16} /></button></div>) : <div className="empty-state">{t("Подписок пока нет")}</div>}</article>
      </section>
      <section className="panel recurring-section"><h2>{t("Регулярные операции")}</h2><form className="form-grid" onSubmit={addRecurring}>
        <label>{t("Название")}<input value={recForm.name} onChange={(event) => setRecForm({ ...recForm, name: event.target.value })} required /></label>
        <label>{t("Тип")}<select value={recForm.type} onChange={(event) => setRecForm({ ...recForm, type: event.target.value })}><option value="expense">{t("Expense")}</option><option value="income">{t("Income")}</option></select></label>
        <label>{t("Категория")}<input value={recForm.category} onChange={(event) => setRecForm({ ...recForm, category: event.target.value })} required /></label>
        <label>{t("Сумма")}<input type="number" min="0.01" step="0.01" value={recForm.amount} onChange={(event) => setRecForm({ ...recForm, amount: event.target.value })} required /></label>
        <label>{t("Период")}<select value={recForm.frequency} onChange={(event) => setRecForm({ ...recForm, frequency: event.target.value })}><option value="daily">{t("Ежедневно")}</option><option value="weekly">{t("Еженедельно")}</option><option value="monthly">{t("Ежемесячно")}</option><option value="yearly">{t("Ежегодно")}</option></select></label>
        <label>{t("Следующая дата")}<input type="date" value={recForm.next_date} onChange={(event) => setRecForm({ ...recForm, next_date: event.target.value })} required /></label>
        <button className="primary-button full-field" type="submit"><Plus size={17} />{t("Добавить регулярную")}</button>
      </form>{recurring.map((item) => <div className="list-row" key={item.id}><div><strong>{item.name}</strong><span>{t(item.frequency)} · {item.next_date}</span></div><b>{item.amount.toLocaleString()} ₸</b><button type="button" onClick={() => removeRecurring(item.id)}><Trash2 size={16} /></button></div>)}</section>
    </motion.div>
  );
}
