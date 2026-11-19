import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LockKeyhole, Mail, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useAppStore } from "../store/appStore";
import { useTranslation } from "../i18n";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const register = useAuthStore((state) => state.register);
  const setNotice = useAppStore((state) => state.setNotice);
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setNotice({ type: "error", text: t("Пароли не совпадают") });
      return;
    }
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      setNotice({ type: "success", text: t("Аккаунт создан. Войдите в систему") });
      navigate("/login", { replace: true });
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <motion.section className="auth-card" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <div className="auth-brand"><div className="brand-mark">P</div><strong>Penny</strong></div>
        <p className="eyebrow">{t("CREATE ACCOUNT")}</p>
        <h1>{t("Start managing money")}</h1>
        <form className="auth-form" onSubmit={submit}>
          <label><span>{t("Name")}</span><div className="input-with-icon"><User size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Aidana" minLength={2} maxLength={100} required /></div></label>
          <label><span>{t("Email")}</span><div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></div></label>
          <label><span>{t("Password")}</span><div className="input-with-icon"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("Minimum 8 characters")} minLength={8} maxLength={128} required /></div></label>
          <label><span>{t("Confirm Password")}</span><div className="input-with-icon"><LockKeyhole size={18} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t("Repeat password")} minLength={8} maxLength={128} required /></div></label>
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? t("Creating account...") : t("Create Account")}</button>
        </form>
        <p className="auth-link"><Link to="/login"><ArrowLeft size={14} /> {t("Back to Login")}</Link></p>
      </motion.section>
    </main>
  );
}
