'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = saved ? saved === 'dark' : prefersDark
    setIsDark(initialDark)
    if (initialDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  if (!mounted) return null

  return (
    <button
      type="button"
      aria-label="Cambiar tema"
      onClick={toggle}
      className="rounded-md border border-black/10 bg-white text-zinc-700 hover:bg-zinc-100 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80"
    >
      {isDark ? '☀️ Claro' : '🌙 Oscuro'}
    </button>
  )
}