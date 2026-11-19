import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, User } from "lucide-react";
import { api } from "../services/api";
import { useAppStore } from "../store/appStore";
import { useTranslation } from "../i18n";

type Message = { id: number; role: "user" | "assistant"; content: string };
const suggestions = [
  "Как сократить расходы?",
  "Составь бюджет на месяц.",
  "Проанализируй мои траты.",
  "Как накопить 500 000 тенге?",
];

export default function AIPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { setNotice } = useAppStore();

  useEffect(() => {
    api.get<Array<{ id: number; role: "user" | "assistant"; content: string }>>("/ai/history")
      .then(({ data }) => setMessages(data))
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", content: text }]);
    setQuestion("");
    setLoading(true);
    try {
      const { data } = await api.post<{ answer: string }>("/ai/chat", { question: text });
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: data.answer }]);
    } catch (error) {
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: (error as Error).message }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    if (!window.confirm(t("Очистить всю историю диалога?"))) return;
    try {
      await api.delete("/ai/history");
      setMessages([]);
      setNotice({ type: "success", text: t("История диалога очищена") });
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page chat-page">
      <header className="page-header"><div><p className="eyebrow">{t("PERSONAL ADVISOR")}</p><h1>{t("AI Assistant")}</h1></div><button className="secondary-button" type="button" onClick={clearHistory} disabled={!messages.length}>{t("Очистить чат")}</button></header>
      <section className="chat-panel panel">
        <div className="chat-messages">
          {!messages.length && <div className="chat-welcome"><div className="ai-icon"><Bot /></div><h2>{t("How can I help with your finances?")}</h2><p>{t("Ask about spending, budgets or saving goals.")}</p></div>}
          {messages.map((message) => (
            <motion.div className={`message ${message.role}`} key={message.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22 }}>
              <div className="message-avatar">{message.role === "assistant" ? <Bot size={18} /> : <User size={18} />}</div>
              <div className="message-bubble">{message.content}</div>
            </motion.div>
          ))}
          {loading && <motion.div className="message assistant" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="message-avatar"><Bot size={18} /></div><div className="thinking"><span>{t("AI думает")}</span><div className="typing"><span /><span /><span /></div></div></motion.div>}
          <div ref={endRef} />
        </div>
        <div className="chat-composer">
          <div className="quick-prompts">
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setQuestion(suggestion)}>{t(suggestion)}</button>
            ))}
          </div>
          <form className="chat-form" onSubmit={submit}>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={t("Спросите о ваших финансах...")} required />
            <button type="submit" disabled={loading || !question.trim()} aria-label="Отправить"><Send size={19} /></button>
          </form>
        </div>
      </section>
    </motion.div>
  );
}
