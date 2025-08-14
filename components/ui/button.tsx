import * as React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary'
}

export function Button({ className = '', variant = 'default', ...props }: ButtonProps) {
  const base = 'inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50'
  const variantClasses =
    variant === 'secondary'
      ? 'bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:ring-accent'
      : 'bg-accent text-accent-foreground hover:bg-emerald-400/90 focus-visible:ring-accent'

  return <button className={`${base} ${variantClasses} ${className}`} {...props} />
}


