import React from 'react'
import { motion } from 'framer-motion'
import { GitCommit } from 'lucide-react'
import styles from './ObjectionLink.module.css'

interface ObjectionLinkProps {
  from: string
  to: string
  delay?: number
}

const ObjectionLink: React.FC<ObjectionLinkProps> = ({ delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={styles.objectionContainer}
    >
      <div className={styles.line}>
        <motion.div 
          className={styles.animatedLine}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1, delay: delay + 0.2 }}
          style={{ transformOrigin: 'top' }}
        />
      </div>
      <div className={styles.labelWrapper}>
        <GitCommit size={16} className={styles.icon} />
        <span className={styles.labelText}>İtiraz Noktası: Ölçeklenebilirlik vs Maliyet</span>
      </div>
    </motion.div>
  )
}

export default ObjectionLink
