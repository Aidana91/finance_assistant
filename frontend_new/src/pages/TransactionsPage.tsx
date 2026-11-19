import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { api } from "../services/api";
import { useAppStore } from "../store/appStore";
import type { Transaction, TransactionType } from "../types";
import { useTranslation } from "../i18n";

const empty = { type: "expense" as TransactionType, category: "", amount: "", date: "", comment: "" };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(empty);
  const [smartText, setSmartText] = useState("");
  const [listening, setListening] = useState(false);
  const { setNotice } = useAppStore();
  const { t, language } = useTranslation();

  async function load() {
    try {
      const params = { search: search || undefined, type: type || undefined, sort };
      const { data } = await api.get<Transaction[]>("/transactions", { params });
      setTransactions(data);
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  useEffect(() => { load(); }, [search, type, sort]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, date: new Date().toISOString().slice(0, 10) });
    setModal(true);
  }

  function openEdit(item: Transaction) {
    setEditing(item);
    setForm({ type: item.type, category: item.category, amount: String(item.amount), date: item.date, comment: item.comment ?? "" });
    setModal(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.category.trim()) return;
    const payload = { ...form, amount: Number(form.amount) };
    try {
      if (editing) await api.put(`/transaction/${editing.id}`, payload);
      else await api.post("/transaction", payload);
      setNotice({ type: "success", text: t(editing ? "Операция обновлена" : "Операция добавлена") });
      setModal(false);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  async function createFromText() {
    if (!smartText.trim()) return;
    try {
      const { data } = await api.post<{ category: string; amount: number; type: TransactionType }>("/ai/categorize", { text: smartText });
      await api.post("/transaction", {
        type: data.type,
        category: data.category,
        amount: data.amount,
        date: new Date().toISOString().slice(0, 10),
        comment: smartText,
      });
      setSmartText("");
      setNotice({ type: "success", text: t("Операция автоматически создана") });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  function startVoice() {
    const speechWindow = window as unknown as {
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onend: () => void;
        start: () => void;
      };
    };
    if (!speechWindow.webkitSpeechRecognition) {
      setNotice({ type: "error", text: t("Голосовой ввод не поддерживается этим браузером") });
      return;
    }
    const recognition = new speechWindow.webkitSpeechRecognition();
    recognition.lang = language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      setSmartText(event.results[0][0].transcript);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  async function remove(id: number) {
    if (!window.confirm(t("Удалить эту операцию?"))) return;
    try {
      await api.delete(`/transaction/${id}`);
      setNotice({ type: "success", text: t("Операция удалена") });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("MONEY FLOW")}</p><h1>{t("Transactions")}</h1></div><button className="primary-button" type="button" onClick={openCreate}><Plus size={18} /> {t("Add transaction")}</button></header>
      <section className="panel smart-entry">
        <div className="smart-entry-heading"><div className="smart-icon"><Sparkles size={18} /></div><div><h2>{t("Smart expense entry")}</h2><p>{t("Напишите или произнесите операцию, например: «Оплатил такси 3500»")}</p></div></div>
        <div className="smart-entry-form">
          <input value={smartText} onChange={(event) => setSmartText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createFromText(); }} placeholder="KFC 4500" />
          <button type="button" className={listening ? "voice-button listening" : "voice-button"} onClick={startVoice} aria-label={t("Голосовой ввод")}><Mic size={18} /></button>
          <button type="button" className="primary-button" onClick={() => void createFromText()} disabled={!smartText.trim()}><Sparkles size={17} /> {t("Создать")}</button>
        </div>
      </section>
      <section className="panel transactions-panel">
        <div className="toolbar">
          <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search transactions")} /></label>
          <select value={type} onChange={(event) => setType(event.target.value)}><option value="">{t("All types")}</option><option value="income">{t("Income")}</option><option value="expense">{t("Expense")}</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="date_desc">{t("Newest")}</option><option value="date_asc">{t("Oldest")}</option><option value="amount_desc">{t("Amount: high")}</option><option value="amount_asc">{t("Amount: low")}</option></select>
        </div>
        {transactions.length ? <div className="table-wrap"><table><thead><tr><th>{t("Category")}</th><th>{t("Type")}</th><th>{t("Amount")}</th><th>{t("Date")}</th><th>{t("Comment")}</th><th></th></tr></thead><tbody>
          {transactions.map((item) => <tr key={item.id}><td><strong>{item.category}</strong></td><td><span className={`type-badge ${item.type}`}>{t(item.type === "income" ? "Income" : "Expense")}</span></td><td className={item.type === "income" ? "positive" : "negative"}>{item.type === "income" ? "+" : "-"}{item.amount.toLocaleString()} ₸</td><td>{item.date}</td><td className="comment-cell">{item.comment || "—"}</td><td><div className="row-actions"><button type="button" onClick={() => openEdit(item)} aria-label={t("Редактировать")}><Pencil size={16} /></button><button type="button" onClick={() => remove(item.id)} aria-label={t("Удалить")}><Trash2 size={16} /></button></div></td></tr>)}
        </tbody></table></div> : <div className="empty-state">{t("No matching transactions")}</div>}
      </section>
      {modal && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={() => setModal(false)}><motion.div className="modal" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><h2>{t(editing ? "Edit transaction" : "New transaction")}</h2><button type="button" onClick={() => setModal(false)}><X /></button></div>
        <form onSubmit={submit} className="form-grid">
          <label>{t("Type")}<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType })}><option value="expense">{t("Expense")}</option><option value="income">{t("Income")}</option></select></label>
          <label>{t("Category")}<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required maxLength={80} /></label>
          <label>{t("Amount")}<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
          <label>{t("Date")}<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
          <label className="full-field">{t("Comment")}<textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} maxLength={500} /></label>
          <button className="primary-button full-field" type="submit">{t(editing ? "Save changes" : "Add transaction")}</button>
        </form>
      </motion.div></motion.div>}
    </motion.div>
  );
}
