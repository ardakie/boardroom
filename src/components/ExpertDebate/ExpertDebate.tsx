import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, PenTool, Code, Megaphone, TrendingUp, ShieldAlert } from 'lucide-react'
import styles from './ExpertDebate.module.css'

import { DebateMessage } from '../../services/aiService'
import { Language, i18n } from '../../utils/i18n'

interface ExpertDebateProps {
  topic: string
  selectedExperts: string[]
  aiMessages: DebateMessage[]
  onComplete: () => void
  language: Language
}

const EXPERT_ICONS: Record<string, React.ElementType> = {
  ceo: Briefcase,
  product: PenTool,
  dev: Code,
  marketing: Megaphone,
  finance: TrendingUp,
  legal: ShieldAlert
}

const ExpertDebate: React.FC<ExpertDebateProps> = ({ topic, selectedExperts, aiMessages, onComplete, language }) => {
  const t = i18n[language]
  const expertNames = t.expertRoles as Record<string, string>
  const [messages, setMessages] = useState<{ id: number; role: string; text: string }[]>([])
  const [isTyping, setIsTyping] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aiMessages.length === 0) {
      setIsTyping(selectedExperts[0] || 'ceo')
      return
    }

    let currentIndex = 0
    let messageId = 0
    let isActive = true
    const timers: ReturnType<typeof setTimeout>[] = []

    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => { if (isActive) fn() }, ms))
    }

    const playNextMessage = () => {
      if (!isActive) return
      if (currentIndex >= aiMessages.length) {
        setIsTyping(null)
        onComplete()
        return
      }

      const currentLine = aiMessages[currentIndex]
      setIsTyping(currentLine.expertId)

      // Typing effect süresi
      schedule(() => {
        setMessages(prev => [...prev, { id: messageId++, role: currentLine.expertId, text: currentLine.text }])
        setIsTyping(null)
        currentIndex++

        // Bir sonraki mesaja geçmeden önceki bekleme
        schedule(playNextMessage, currentLine.delay)
      }, 800) // Her mesajın yazılması için sabit bir simülasyon süresi
    }

    // İlk mesajı biraz gecikmeli başlat
    schedule(playNextMessage, 500)

    return () => {
      isActive = false
      timers.forEach(clearTimeout)
    }
  }, [aiMessages, onComplete, selectedExperts])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (aiMessages.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>{t.board.debatePreparing}</p>
      </div>
    )
  }

  return (
    <div className={styles.debateContainer}>
      <div className={styles.header}>
        <div className={styles.pulseIndicator} />
        <span className={styles.headerTitle}>{t.board.title}</span>
        <span className={styles.timer}>{t.board.liveAnalysis}</span>
      </div>
      
      <div className={styles.topicBox}>
        <span className={styles.topicLabel}>{t.board.topic}:</span>
        <span className={styles.topicText}>{topic}</span>
      </div>

      <div className={styles.chatArea} ref={containerRef}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const Icon = EXPERT_ICONS[msg.role] || Briefcase
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.messageRow}
              >
                <div className={styles.avatar}>
                  <Icon size={16} />
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageName}>{expertNames[msg.role] || msg.role}</div>
                  <div className={styles.messageBubble}>{msg.text}</div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className={styles.typingIndicatorRow}
          >
            <div className={styles.avatar}>
              {React.createElement(EXPERT_ICONS[isTyping] || Briefcase, { size: 16 })}
            </div>
            <div className={styles.typingBubble}>
              <span>.</span><span>.</span><span>.</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ExpertDebate
