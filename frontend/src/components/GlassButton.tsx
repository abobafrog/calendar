import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon'
}

export function GlassButton({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: PropsWithChildren<Props>) {
  return (
    <button className={`glass-button glass-button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
