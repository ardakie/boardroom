import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import styles from './KineticHero.module.css'

import { Language, i18n } from '../../utils/i18n'

interface KineticHeroProps {
  onStart: (topic: string, experts: string[], depth: 'low' | 'medium' | 'high') => void
  language: Language
}

const KineticHero: React.FC<KineticHeroProps> = ({ onStart, language }) => {
  const t = i18n[language]

  const AVAILABLE_EXPERTS = [
    { id: 'ceo', label: t.expertRoles.ceo },
    { id: 'product', label: t.expertRoles.product },
    { id: 'dev', label: t.expertRoles.dev },
    { id: 'marketing', label: t.expertRoles.marketing },
    { id: 'finance', label: t.expertRoles.finance },
    { id: 'legal', label: t.expertRoles.legal }
  ]

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [inputValue, setInputValue] = useState('')
  const [selectedExperts, setSelectedExperts] = useState<string[]>(AVAILABLE_EXPERTS.map(e => e.id))
  const [depth, setDepth] = useState<'low' | 'medium' | 'high'>('medium')
  
  const heroRef = useRef<HTMLDivElement>(null)

  const handleIdeaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setStep(2)
    }
  }

  const handleNextStep = () => {
    if (selectedExperts.length > 0) {
      setStep(3)
    }
  }

  const handleStartMeeting = () => {
    onStart(inputValue, selectedExperts, depth)
  }

  const toggleExpert = (id: string) => {
    setSelectedExperts(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  return (
    <div 
      className={styles.heroContainer} 
      ref={heroRef}
    >

      <div className={styles.contentWrapper}>
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.8 }}
              className={styles.stepContainer}
            >
              <div className={styles.logoContainer}>
                <div className={styles.logoCropWrapper}>
                  <img src="/logo-main.png" alt="Boardroom Logo" className={styles.mainLogo} />
                </div>
                <a 
                  href="https://weis.ltd" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.poweredBy}
                >
                  <span className={styles.poweredText}>POWERED BY</span>
                  <img src="/logo-powered.webp" alt="Weis Logo" className={styles.poweredLogo} />
                </a>
              </div>
              <p className={styles.subtitle}>
                {t.hero.subtitle}
              </p>

              <form onSubmit={handleIdeaSubmit} className={styles.form}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t.hero.inputPlaceholder}
                  className={styles.inputField}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={!inputValue.trim()}
                >
                  <ArrowRight size={24} strokeWidth={1.5} />
                </button>
              </form>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8 }}
              className={styles.stepContainer}
            >
              <h2 className={styles.step2Title}>{t.hero.step2Title}</h2>
              <p className={styles.step2Subtitle}>
                {t.hero.step2SubtitlePart1}{inputValue}{t.hero.step2SubtitlePart2}
              </p>

              <div className={styles.expertGrid}>
                {AVAILABLE_EXPERTS.map(expert => {
                  const isSelected = selectedExperts.includes(expert.id)
                  return (
                    <button
                      key={expert.id}
                      onClick={() => toggleExpert(expert.id)}
                      className={clsx(styles.expertToggle, isSelected && styles.expertToggleActive)}
                    >
                      <div className={clsx(styles.checkbox, isSelected && styles.checkboxActive)}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                      <span>{expert.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className={styles.actionRow}>
                <button 
                  className={styles.backButton}
                  onClick={() => setStep(1)}
                >
                  {t.hero.btnBack}
                </button>
                <button 
                  className={styles.startMeetingButton}
                  onClick={handleNextStep}
                  disabled={selectedExperts.length === 0}
                >
                  {t.hero.btnNext}
                  <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8 }}
              className={styles.stepContainer}
            >
              <h2 className={styles.step2Title}>{t.hero.step3Title}</h2>
              <p className={styles.step2Subtitle}>
                {t.hero.step3Subtitle}
              </p>

              <div className={styles.depthGrid}>
                <button
                  onClick={() => setDepth('low')}
                  className={clsx(styles.depthCard, depth === 'low' && styles.depthCardActive)}
                >
                  <div className={styles.depthTitle}>{t.hero.depthLowTitle}</div>
                  <div className={styles.depthDesc}>{t.hero.depthLowDesc}</div>
                </button>

                <button
                  onClick={() => setDepth('medium')}
                  className={clsx(styles.depthCard, depth === 'medium' && styles.depthCardActive)}
                >
                  <div className={styles.depthTitle}>{t.hero.depthMediumTitle}</div>
                  <div className={styles.depthDesc}>{t.hero.depthMediumDesc}</div>
                </button>

                <button
                  onClick={() => setDepth('high')}
                  className={clsx(styles.depthCard, depth === 'high' && styles.depthCardActive)}
                >
                  <div className={styles.depthTitle}>{t.hero.depthHighTitle}</div>
                  <div className={styles.depthDesc}>{t.hero.depthHighDesc}</div>
                </button>
              </div>

              <div className={styles.actionRow}>
                <button 
                  className={styles.backButton}
                  onClick={() => setStep(2)}
                >
                  {t.hero.btnBack}
                </button>
                <button 
                  className={styles.startMeetingButton}
                  onClick={handleStartMeeting}
                >
                  {t.hero.startBtn}
                  <Check size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default KineticHero
