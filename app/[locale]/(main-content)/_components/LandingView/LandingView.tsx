'use client'

import { motion } from 'framer-motion'
import { Link } from '@/src/i18n/navigation'
import styles from './styles.module.css'

type Props = {
  tagline: string
  cta: string
}

const ease = [0.16, 1, 0.3, 1] as const

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}

export function LandingView({ tagline, cta }: Props) {
  return (
    <motion.main
      className={styles.root}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      <motion.h1 className={styles.title} variants={item}>
        GHarmony
      </motion.h1>
      <motion.p className={styles.tagline} variants={item}>
        {tagline}
      </motion.p>
      <motion.div variants={item}>
        <Link href="/hum" className={styles.cta}>
          {cta}
        </Link>
      </motion.div>
    </motion.main>
  )
}
