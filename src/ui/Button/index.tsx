import type { ButtonHTMLAttributes } from 'react'
import styles from './styles.module.css'
import { cn } from '@/src/utils/helpers'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'small' | 'normal' | 'large'
  view?: 'filled' | 'outlined' | 'ghost'
}

export function Button({ size = 'normal', view = 'filled', className, ...props }: Props) {
  return (
    <button
      className={cn(styles.button, styles[size], styles[view], className)}
      {...props}
    />
  )
}
