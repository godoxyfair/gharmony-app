import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './styles.module.css'
import { cn } from '@/src/utils/helpers'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  size?: 'small' | 'normal' | 'large'
  children: ReactNode
}

export function IconButton({ label, size = 'normal', className, children, ...props }: Props) {
  return (
    <button
      aria-label={label}
      className={cn(styles.button, styles[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
