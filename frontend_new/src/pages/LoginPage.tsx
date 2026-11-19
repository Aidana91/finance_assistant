import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useAppStore } from "../store/appStore";
import { useTranslation } from "../i18n";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const setNotice = useAppStore((state) => state.setNotice);
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      setNotice({ type: "success", text: t("Вы успешно вошли") });
      navigate("/dashboard", { replace: true });
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
        <p className="eyebrow">{t("WELCOME BACK")}</p>
        <h1>{t("Sign in to your account")}</h1>
        <form className="auth-form" onSubmit={submit}>
          <label><span>{t("Email")}</span><div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></div></label>
          <label><span>{t("Password")}</span><div className="input-with-icon"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("Enter password")} minLength={8} required /></div></label>
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? t("Signing in...") : t("Sign In")} {!submitting && <ArrowRight size={18} />}</button>
        </form>
        <p className="auth-link">{t("New to Penny?")} <Link to="/register">{t("Create account")}</Link></p>
      </motion.section>
    </main>
  );
}
