import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Download } from 'lucide-react'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import ReactMarkdown from 'react-markdown'
import styles from './BoardDecision.module.css'
import { Language, i18n } from '../../utils/i18n'

interface BoardDecisionProps {
  topic: string
  depth: 'low' | 'medium' | 'high'
  synthesisReport: string
  language: Language
}

const BoardDecision: React.FC<BoardDecisionProps> = ({ topic, depth, synthesisReport, language }) => {
  const t = i18n[language]

  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-report')
    if (!element) return

    const opt = {
      margin:       10,
      filename:     `Kurul_Karari_${topic.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as any

    html2pdf().set(opt).from(element).save()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.pdfButton} onClick={handleDownloadPdf} title={t.report.downloadTitle}>
          <Download size={18} />
          <span>{t.report.downloadBtn}</span>
        </button>

        <div className={styles.iconWrapper}>
          <FileText size={24} strokeWidth={1.5} />
        </div>
        <h2 className={styles.title}>{t.report.title}</h2>
      </div>

      <div id="printable-report" className={styles.document}>
        <motion.div 
          className={styles.logoStamp}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <img src="/logo-main.png" alt="Boardroom Logo" style={{ height: '40px', filter: 'brightness(0)' }} />
        </motion.div>

        <div className={styles.docHeader}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>{t.report.subtitle}</span>
            {depth === 'low' && <span className={styles.depthBadge}>{t.report.depthLow}</span>}
            {depth === 'medium' && <span className={styles.depthBadge}>{t.report.depthMedium}</span>}
            {depth === 'high' && <span className={styles.depthBadge}>{t.report.depthHigh}</span>}
          </div>
          <h3 className={styles.docTitle}>{t.report.topicPrefix} {topic}</h3>
        </div>
        
        <div className={styles.body}>
          <ReactMarkdown>{synthesisReport}</ReactMarkdown>
        </div>

        <div className={styles.footer}>
          <p className={styles.signature}>{t.report.ceo}</p>
          <div className={styles.date}>{new Date().toLocaleDateString(t.report.locale, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
    </div>
  )
}

export default BoardDecision
