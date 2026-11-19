import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../services/api";
import { useAppStore } from "../store/appStore";
import type { Goal } from "../types";
import { useTranslation } from "../i18n";

export default function GoalsPage() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState({ name: "", target_amount: "", current_amount: "0", deadline: "" });
  const { setNotice } = useAppStore();

  async function load() {
    const { data } = await api.get<Goal[]>("/goals");
    setGoals(data);
  }
  useEffect(() => { load().catch((error) => setNotice({ type: "error", text: error.message })); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", target_amount: "", current_amount: "0", deadline: "" });
    setModal(true);
  }
  function openEdit(goal: Goal) {
    setEditing(goal);
    setForm({ name: goal.name, target_amount: String(goal.target_amount), current_amount: String(goal.current_amount), deadline: goal.deadline });
    setModal(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { name: form.name, target_amount: Number(form.target_amount), current_amount: Number(form.current_amount), deadline: form.deadline };
    try {
      if (editing) await api.put(`/goals/${editing.id}`, payload);
      else await api.post("/goals", payload);
      setNotice({ type: "success", text: t(editing ? "Цель обновлена" : "Цель создана") });
      setModal(false);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }
  async function remove(id: number) {
    if (!window.confirm(t("Удалить эту цель?"))) return;
    await api.delete(`/goals/${id}`);
    setNotice({ type: "success", text: t("Цель удалена") });
    await load();
  }
  async function complete(goal: Goal) {
    const isCompleted = !!goal.completed;
    await api.put(`/goals/${goal.id}`, { completed: !isCompleted, current_amount: !isCompleted ? goal.target_amount : goal.current_amount });
    await load();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("PLANNING")}</p><h1>{t("Financial goals")}</h1></div><button className="primary-button" type="button" onClick={openCreate}><Plus size={18} /> {t("New goal")}</button></header>
      <section className="goals-grid">{goals.map((goal) => {
        const percent = Math.min(100, goal.target_amount ? goal.current_amount / goal.target_amount * 100 : 0);
        const remaining = Math.max(0, goal.target_amount - goal.current_amount);
        return <motion.article layout className="panel goal-card" key={goal.id}>
          <div className="goal-heading"><div className="goal-icon"><Check /></div><div className="row-actions"><button type="button" onClick={() => openEdit(goal)}><Pencil size={16} /></button><button type="button" onClick={() => remove(goal.id)}><Trash2 size={16} /></button></div></div>
          <h2>{goal.name}</h2><p>{t("до")} {goal.deadline}</p>
          <strong className="goal-progress">{percent.toFixed(0)}%</strong>
          <div className="goal-track"><div style={{ width: `${percent}%` }} /></div>
          <div className="goal-values"><span>{goal.current_amount.toLocaleString()} ₸ {t("saved")}</span><span>{remaining.toLocaleString()} ₸ {t("left")}</span></div>
          <button className={goal.completed ? "secondary-button" : "primary-button"} type="button" onClick={() => complete(goal)}>{t(goal.completed ? "Restore" : "Complete")}</button>
        </motion.article>;
      })}</section>
      {!goals.length && <div className="empty-state panel">{t("No goals yet")}</div>}
      {modal && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={() => setModal(false)}><motion.div className="modal" initial={{ y: 12 }} animate={{ y: 0 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><h2>{t(editing ? "Edit goal" : "New goal")}</h2><button type="button" onClick={() => setModal(false)}><X /></button></div>
        <form className="form-grid" onSubmit={submit}>
          <label className="full-field">{t("Name")}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={120} /></label>
          <label>{t("Target amount")}<input type="number" min="0.01" step="0.01" value={form.target_amount} onChange={(event) => setForm({ ...form, target_amount: event.target.value })} required /></label>
          <label>{t("Current amount")}<input type="number" min="0" step="0.01" value={form.current_amount} onChange={(event) => setForm({ ...form, current_amount: event.target.value })} required /></label>
          <label className="full-field">{t("Deadline")}<input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} required /></label>
          <button className="primary-button full-field" type="submit">{t("Save goal")}</button>
        </form>
      </motion.div></motion.div>}
    </motion.div>
  );
}
