import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon, Maximize2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import styles from './ExpertPanel.module.css'
import clsx from 'clsx'
import { Language, i18n } from '../../utils/i18n'

interface ExpertPanelProps {
  id: string
  role: string
  name: string
  icon: LucideIcon
  content: React.ReactNode
  topic?: string
  rawAnalysis?: string
  delay?: number
  isObjection?: boolean
  className?: string
  language: Language
}

const ExpertPanel: React.FC<ExpertPanelProps> = ({ 
  role, 
  name, 
  icon: Icon, 
  content,
  topic = '',
  rawAnalysis = '', 
  delay = 0,
  isObjection = false,
  className,
  language
}) => {
  const t = i18n[language]
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'analysis' | 'qa'>('analysis')
  const [question, setQuestion] = React.useState('')
  const [isAsking, setIsAsking] = React.useState(false)
  const [qaHistory, setQaHistory] = React.useState<{q: string, a: string}[]>([])
  const [pendingQuestion, setPendingQuestion] = React.useState('')

  const handleAskQuestion = async () => {
    if (!question.trim()) return
    const q = question
    setQuestion('')
    setPendingQuestion(q)
    setIsAsking(true)
    try {
      const { aiService } = await import('../../services/aiService')
      const answer = await aiService.askExpertQuestion(topic, role, name, rawAnalysis, q)
      setQaHistory(prev => [...prev, { q: q, a: answer }])
    } catch (err) {
      console.error(err)
      setQaHistory(prev => [...prev, { q: q, a: 'Bir hata oluştu. Lütfen tekrar deneyin.' }])
    }
    setPendingQuestion('')
    setIsAsking(false)
  }

  return (
    <>
      <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        delay
      }}
      className={clsx(styles.panel, isObjection && styles.objectionPanel, className)}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <div className={styles.titleInfo}>
          <h3 className={styles.role}>{role}</h3>
          <p className={styles.name}>{name}</p>
        </div>
        <div className={styles.buttonGroup}>
          <button 
            className={styles.askButton} 
            onClick={(e) => { e.stopPropagation(); setActiveTab('qa'); setIsModalOpen(true); }}
            title={t.panel.askQ}
          >
            {t.panel.askQ}
          </button>
          <button 
            className={styles.expandButton} 
            onClick={(e) => { e.stopPropagation(); setActiveTab('analysis'); setIsModalOpen(true); }}
            title={t.panel.seeAll}
          >
            <Maximize2 size={14} /> <span>{t.panel.seeAll}</span>
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        {content}
      </div>
      
      {/* Subtle bottom gradient to indicate depth */}
      <div className={styles.fadeBottom} />
    </motion.div>

    <AnimatePresence>
        {isModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <motion.div 
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
              <div className={styles.modalHeader}>
                <div className={styles.modalIconWrapper}>
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className={styles.modalRole}>{role}</h3>
                  <p className={styles.modalName}>{name}</p>
                </div>
                <div className={styles.tabGroup}>
                  <button 
                    className={clsx(styles.tabButton, activeTab === 'analysis' && styles.activeTab)}
                    onClick={() => setActiveTab('analysis')}
                  >
                    {t.panel.analysisTab}
                  </button>
                  <button 
                    className={clsx(styles.tabButton, activeTab === 'qa' && styles.activeTab)}
                    onClick={() => setActiveTab('qa')}
                  >
                    {t.panel.askTab}
                  </button>
                </div>
              </div>
              <div className={styles.modalBody}>
                {activeTab === 'analysis' ? (
                  content
                ) : (
                  <div className={styles.qaContainer}>
                    <div className={styles.qaHistory}>
                      {qaHistory.length === 0 && !isAsking && (
                        <p className={styles.qaEmptyText}>{t.panel.emptyQ}</p>
                      )}
                      {qaHistory.map((item, idx) => (
                        <div key={idx} className={styles.qaItem}>
                          <div className={styles.qBubble}><strong>{t.panel.you}</strong> {item.q}</div>
                          <div className={styles.aBubble}>
                            <ReactMarkdown>{item.a}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                      {isAsking && (
                        <div className={styles.qaItem}>
                          <div className={styles.qBubble}><strong>{t.panel.you}</strong> {pendingQuestion}</div>
                          <div className={styles.aBubble}>{t.panel.thinking}</div>
                        </div>
                      )}
                    </div>
                    <div className={styles.qaInputArea}>
                      <input 
                        type="text" 
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={t.panel.placeholder}
                        className={styles.qaInput}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      />
                      <button 
                        onClick={handleAskQuestion} 
                        disabled={isAsking || !question.trim()}
                        className={styles.qaSendBtn}
                      >
                        {t.panel.send}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ExpertPanel
