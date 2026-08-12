import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import KineticHero from './components/KineticHero/KineticHero'
import BoardDecisionCenter from './components/BoardDecisionCenter/BoardDecisionCenter'
import { Language } from './utils/i18n'
import styles from './App.module.css'

function App() {
  const [language, setLanguage] = useState<Language>('tr')
  const [hasStarted, setHasStarted] = useState(false)
  const [topic, setTopic] = useState('')
  const [selectedExperts, setSelectedExperts] = useState<string[]>([])
  const [depth, setDepth] = useState<'low' | 'medium' | 'high'>('medium')

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, clientX: -1000, clientY: -1000 })
  const appRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!appRef.current) return
    const rect = appRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setMousePosition({ x, y, clientX: e.clientX, clientY: e.clientY })
  }

  const handleStart = (inputTopic: string, experts: string[], selectedDepth: 'low' | 'medium' | 'high') => {
    setTopic(inputTopic)
    setSelectedExperts(experts)
    setDepth(selectedDepth)
    setHasStarted(true)
  }

  const handleRestart = () => {
    setHasStarted(false)
    setTopic('')
    setSelectedExperts([])
  }

  return (
    <div 
      className={styles.appContainer}
      ref={appRef}
      onMouseMove={handleMouseMove}
    >
      {/* Background Kinetic Organic Form (Site-wide) */}
      <div className={styles.kineticBackground}>
        {/* Interactive Grid that reveals under the cursor */}
        <div 
          className={styles.interactiveGrid}
          style={{
            WebkitMaskImage: `radial-gradient(circle 400px at ${mousePosition.clientX}px ${mousePosition.clientY}px, black 0%, transparent 100%)`,
            maskImage: `radial-gradient(circle 400px at ${mousePosition.clientX}px ${mousePosition.clientY}px, black 0%, transparent 100%)`,
          }}
        />

        {/* Interactive Spotlight Cursor */}
        <motion.div 
          className={styles.cursorSpotlight}
          animate={{
            x: mousePosition.clientX - 400, // Center the 800px spotlight
            y: mousePosition.clientY - 400,
          }}
          transition={{ type: 'tween', ease: 'backOut', duration: 0.5 }}
        />

        <motion.div 
          className={styles.organicForm}
          animate={{
            x: mousePosition.x * 20,
            y: mousePosition.y * 20,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <motion.div 
          className={styles.organicFormSecondary}
          animate={{
            x: mousePosition.x * -15,
            y: mousePosition.y * -15,
          }}
          transition={{ type: 'spring', stiffness: 40, damping: 25 }}
        />
      </div>

      {/* Liquid Glass Language Toggle */}
      <button 
        className={styles.langToggleWrapper}
        onClick={() => setLanguage(lang => lang === 'tr' ? 'en' : 'tr')}
        style={{ zIndex: 100 }}
      >
        <span className={language === 'tr' ? styles.activeLang : styles.inactiveLang}>TR</span>
        <span className={styles.langSeparator}>/</span>
        <span className={language === 'en' ? styles.activeLang : styles.inactiveLang}>EN</span>
      </button>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className={styles.stage}
            >
              <KineticHero onStart={handleStart} language={language} />
            </motion.div>
          ) : (
            <motion.div
              key="boardroom"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className={styles.stage}
            >
              <BoardDecisionCenter 
                topic={topic} 
                selectedExperts={selectedExperts} 
                depth={depth} 
                onRestart={handleRestart}
                language={language}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
