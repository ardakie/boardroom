import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, PenTool, Code, Megaphone, TrendingUp, ShieldAlert, LucideIcon, Loader2 } from 'lucide-react'
import BoardDecision from '../BoardDecision/BoardDecision'
import ExpertDebate from '../ExpertDebate/ExpertDebate'
import ExpertPanel from '../ExpertPanel/ExpertPanel'
import styles from './BoardDecisionCenter.module.css'

import { aiService, DebateMessage, ExpertPanelContent } from '../../services/aiService'
import { Language, i18n } from '../../utils/i18n'

interface BoardDecisionCenterProps {
  topic: string
  selectedExperts: string[]
  depth: 'low' | 'medium' | 'high'
  onRestart: () => void
  language: Language
}

type SimulationPhase = 'initializing' | 'presenting_experts' | 'debating' | 'synthesis_ready'

const BoardDecisionCenter: React.FC<BoardDecisionCenterProps> = ({ topic, selectedExperts, depth, onRestart, language }) => {
  const t = i18n[language]

  const EXPERT_META: Record<string, { role: string, name: string, icon: LucideIcon }> = {
    ceo: { role: t.expertRoles.ceo, name: t.expertRoles.ceoName, icon: Briefcase },
    product: { role: t.expertRoles.product, name: t.expertRoles.productName, icon: PenTool },
    dev: { role: t.expertRoles.dev, name: t.expertRoles.devName, icon: Code },
    marketing: { role: t.expertRoles.marketing, name: t.expertRoles.marketingName, icon: Megaphone },
    finance: { role: t.expertRoles.finance, name: t.expertRoles.financeName, icon: TrendingUp },
    legal: { role: t.expertRoles.legal, name: t.expertRoles.legalName, icon: ShieldAlert }
  }

  const [phase, setPhase] = useState<SimulationPhase>('initializing')
  const [activeExperts, setActiveExperts] = useState<string[]>([])
  const [showReportModal, setShowReportModal] = useState(false)

  // AI State
  const [expertAnalyses, setExpertAnalyses] = useState<ExpertPanelContent[]>([])
  const [debateMessages, setDebateMessages] = useState<DebateMessage[]>([])
  const [synthesisReport, setSynthesisReport] = useState<string>('')
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    const startSimulation = async () => {
      try {
        // 1. Önce uzman analizlerini (kutucuklardaki ilk yorumları) üret
        const analyses = await aiService.generateExpertAnalyses(topic, selectedExperts, language)
        if (!isMounted) return
        setExpertAnalyses(analyses)
        setPhase('presenting_experts')

        // 2. Kutucukların sırayla belirmesi zaten component mount olduğunda (initializing) başladı.
        // Sadece küçük bir gecikme ekleyelim
        const presentationTime = 1000;
        await new Promise(r => setTimeout(r, presentationTime))
        if (!isMounted) return

        // 3. Eğer depth 'high' ise münakaşa (debate) başlat
        if (depth === 'high') {
          setPhase('debating')
          // Tartışmaya ilk analizleri de gönder
          const msgs = await aiService.generateDebate(topic, selectedExperts, analyses, language)
          if (!isMounted) return
          setDebateMessages(msgs)
          // Not: ExpertDebate bileşeni onComplete tetiklediğinde phase değişecek.
        } else {
          // 'high' değilse direkt senteze geç
          setPhase('synthesis_ready')
        }

      } catch (err: any) {
        console.error("AI Hatası:", err)
        if (isMounted) setAiError(err.message)
      }
    }

    startSimulation()

    return () => { isMounted = false }
  }, [topic, selectedExperts, depth, language])

  // Sentez Raporu (Münakaşa bitince veya düşük depth'te başlar)
  useEffect(() => {
    let isMounted = true

    if (phase === 'synthesis_ready' && expertAnalyses.length > 0 && !synthesisReport && !aiError) {
      const fetchSynthesis = async () => {
        try {
          const synthesis = await aiService.generateSynthesisReport(topic, selectedExperts, depth, expertAnalyses, language)
          if (!isMounted) return
          setSynthesisReport(synthesis)
        } catch (err: any) {
          console.error("AI Hatası (Synthesis):", err)
          if (isMounted) setAiError(err.message)
        }
      }
      fetchSynthesis()
    }

    return () => { isMounted = false }
  }, [phase, expertAnalyses, synthesisReport, aiError, topic, selectedExperts, depth, language])

  // Kutucukların sırayla açılması animasyonu
  useEffect(() => {
    // Component mount olduğunda (veya uzmanlar seçildiğinde) hemen kutucukları sırayla açmaya başla
    if (activeExperts.length < selectedExperts.length) {
      selectedExperts.forEach((expertId, index) => {
        const dynamicDelay = 300 + (index * 400)
        setTimeout(() => {
          setActiveExperts((prev) => prev.includes(expertId) ? prev : [...prev, expertId])
        }, dynamicDelay)
      })
    }
  }, [selectedExperts])

  const getPanelProps = (id: string) => {
    const meta = EXPERT_META[id]
    const analysis = expertAnalyses.find(a => a.expertId === id)
    
    let content
    if (aiError && phase !== 'debating') {
      content = <p className={styles.errorText}>Yapay zeka hatası: {aiError}</p>
    } else if (analysis) {
      content = (
        <>
          {analysis.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </>
      )
    } else {
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '120px', gap: '16px', color: 'var(--color-text-tertiary)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Loader2 size={32} opacity={0.5} />
          </motion.div>
          <motion.p
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: '1px', margin: 0, textTransform: 'uppercase' }}
          >
            {t.board.analyzingPanel}
          </motion.p>
        </div>
      )
    }

    return {
      id,
      topic,
      rawAnalysis: analysis ? analysis.paragraphs.join('\n\n') : '',
      role: meta.role,
      name: meta.name,
      icon: meta.icon,
      content,
      delay: 0,
      language
    }
  }

  if (aiError && expertAnalyses.length === 0) {
    return (
      <div className={styles.container}>
         <div className={styles.header}>
            <button onClick={onRestart} className={styles.closeButton}>{t.board.goBack}</button>
            <h2 className={styles.topicTitle}>{t.board.errorTitle}</h2>
         </div>
         <p style={{color: 'red', textAlign: 'center', marginTop: '20px'}}>{aiError}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img 
          src="/logo-main.png" 
          alt="Boardroom Logo" 
          className={styles.centerLogo} 
          onClick={onRestart}
          title="Ana Sayfaya Dön"
        />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'debating' ? (
          <motion.div 
            key="debate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className={styles.debateWrapper}
          >
            <ExpertDebate 
              topic={topic} 
              selectedExperts={selectedExperts} 
              aiMessages={debateMessages}
              onComplete={() => setPhase('synthesis_ready')} 
              language={language}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className={styles.gridContainerWrapper}
          >
            <h2 className={styles.topicTitle}>{t.board.topic} {topic}</h2>

            <div className={styles.grid}>
              {/* CEO */}
              {activeExperts.includes('ceo') && (
                <div className={styles.cellItem}>
                  <ExpertPanel {...getPanelProps('ceo')} />
                </div>
              )}

              {/* Product & Dev */}
              {activeExperts.includes('product') && (
                <div className={styles.cellItem}>
                  <ExpertPanel {...getPanelProps('product')} />
                </div>
              )}
              {activeExperts.includes('dev') && (
                <div className={styles.cellItem}>
                  <ExpertPanel {...getPanelProps('dev')} />
                </div>
              )}

              {/* Marketing */}
              {activeExperts.includes('marketing') && (
                <div className={styles.cellItem}>
                  <ExpertPanel {...getPanelProps('marketing')} />
                </div>
              )}

              {/* Finance */}
              <AnimatePresence>
                {activeExperts.includes('finance') && (
                  <div className={styles.cellItem}>
                    <ExpertPanel {...getPanelProps('finance')} />
                  </div>
                )}
              </AnimatePresence>

              {/* Legal */}
              {activeExperts.includes('legal') && (
                <div className={styles.cellItem}>
                  <ExpertPanel {...getPanelProps('legal')} />
                </div>
              )}
            </div>

            {/* Synthesis Phase - Report Button */}
            <AnimatePresence>
              {phase === 'synthesis_ready' && !showReportModal && (
                <motion.div 
                  className={styles.reportButtonWrapper}
                  initial={{ opacity: 0, height: 0, overflow: 'hidden', y: 20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  transition={{ duration: 0.8, type: 'spring' }}
                >
                  <button 
                    onClick={() => synthesisReport ? setShowReportModal(true) : null} 
                    className={styles.reportButton}
                    disabled={!synthesisReport}
                    style={{ opacity: synthesisReport ? 1 : 0.6, cursor: synthesisReport ? 'pointer' : 'not-allowed' }}
                  >
                    {!synthesisReport ? (
                      <>
                        <div className={styles.loadingDots}><span>.</span><span>.</span><span>.</span></div>
                        {t.board.reportPreparing}
                      </>
                    ) : (
                      t.board.reportView
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Overlay */}
      <AnimatePresence>
        {showReportModal && (
          <div className={styles.modalOverlay}>
            <motion.div 
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button className={styles.closeButton} onClick={() => setShowReportModal(false)}>{t.board.close}</button>
              <BoardDecision topic={topic} depth={depth} synthesisReport={synthesisReport} language={language} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BoardDecisionCenter
