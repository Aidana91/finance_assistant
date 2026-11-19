import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useAppStore } from "../store/appStore";
import type { Settings } from "../types";
import { useTranslation } from "../i18n";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const { setNotice } = useAppStore();
  const { t } = useTranslation();

  useEffect(() => {
    api.get<Settings>("/settings").then(({ data }) => setSettings(data)).catch((error) => setNotice({ type: "error", text: error.message }));
  }, [setNotice]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    try {
      const { data } = await api.put<Settings>("/settings", {
        theme: settings.theme,
        currency: settings.currency,
        language: settings.language,
        llm_model: settings.llm_model,
      });
      setSettings(data);
      document.documentElement.dataset.theme = data.theme;
      setNotice({ type: "success", text: t("Настройки сохранены") });
    } catch (error) {
      setNotice({ type: "error", text: (error as Error).message });
    }
  }

  useEffect(() => {
    if (settings) document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  if (!settings) return <div className="page"><div className="empty-state">{t("Загрузка настроек...")}</div></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("PREFERENCES")}</p><h1>{t("Settings")}</h1></div></header>
      <form className="panel settings-panel" onSubmit={submit}>
        <h2>{t("Application preferences")}</h2>
        <label>{t("Theme")}<select value={settings.theme} onChange={(event) => setSettings({ ...settings, theme: event.target.value as Settings["theme"] })}><option value="dark">{t("dark")}</option><option value="light">{t("light")}</option></select></label>
        <label>{t("Currency")}<select value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })}><option value="KZT">{t("Казахский тенге (₸)")}</option><option value="RUB">{t("Российский рубль (₽)")}</option><option value="USD">{t("Доллар США ($)")}</option><option value="EUR">{t("Евро (€)")}</option></select></label>
        <label>{t("Language")}<select value={settings.language} onChange={(event) => {
          const language = event.target.value as Settings["language"];
          setSettings({ ...settings, language });
          useAppStore.getState().setLanguage(language);
        }}><option value="ru">Русский</option><option value="en">English</option><option value="kk">Қазақша</option></select></label>
        <label>{t("Ollama model")}<input value={settings.llm_model} onChange={(event) => setSettings({ ...settings, llm_model: event.target.value })} required maxLength={100} /></label>
        <button className="primary-button" type="submit">{t("Save settings")}</button>
      </form>
    </motion.div>
  );
}
