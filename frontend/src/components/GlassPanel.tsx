import type { HTMLAttributes, PropsWithChildren } from 'react'

type Props = PropsWithChildren<HTMLAttributes<HTMLDivElement>>

export function GlassPanel({ className = '', children, ...props }: Props) {
  return (
    <div className={`glass-panel ${className}`} {...props}>
      {children}
    </div>
  )
}
