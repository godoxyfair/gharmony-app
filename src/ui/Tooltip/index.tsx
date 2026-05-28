import type { ReactNode } from 'react'
import styles from './styles.module.css'
import { cn } from '@/src/utils/helpers'

type Props = {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, position = 'top', className }: Props) {
  return (
    <span className={cn(styles.wrapper, className)} role="tooltip" aria-label={content}>
      {children}
      <span className={cn(styles.tip, styles[position])} aria-hidden>
        {content}
      </span>
    </span>
  )
}
