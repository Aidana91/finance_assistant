import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Table } from "lucide-react";
import { api } from "../services/api";
import { useTranslation } from "../i18n";

export default function ExportsPage() {
  const { t } = useTranslation();
  async function download(format: "csv" | "xlsx" | "pdf") {
    const response = await api.get(`/exports/${format}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report.${format}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  const formats = [
    { format: "pdf" as const, title: t("PDF отчёт"), description: t("Готовый месячный финансовый документ"), icon: FileText },
    { format: "xlsx" as const, title: t("Excel таблица"), description: t("Операции в формате XLSX"), icon: FileSpreadsheet },
    { format: "csv" as const, title: t("CSV файл"), description: t("Данные для банковских систем и анализа"), icon: Table },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="page">
      <header className="page-header"><div><p className="eyebrow">{t("DATA CENTER")}</p><h1>{t("Export Center")}</h1></div></header>
      <section className="export-grid">{formats.map(({ format, title, description, icon: Icon }) => <motion.article className="panel export-card" key={format} whileHover={{ y: -5 }}><div className="export-icon"><Icon /></div><h2>{title}</h2><p>{description}</p><button className="primary-button" type="button" onClick={() => download(format)}><Download size={17} /> {t("Скачать")}</button></motion.article>)}</section>
    </motion.div>
  );
}
