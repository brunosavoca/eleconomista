'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

type AuthGateProps = {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const [authorized, setAuthorized] = useState(false)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const ok = typeof window !== 'undefined' && window.localStorage.getItem('ee_access_ok') === '1'
      setAuthorized(Boolean(ok))
    } catch {
      setAuthorized(false)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (ready && !authorized) {
      inputRef.current?.focus()
    }
  }, [ready, authorized])

  const handleSubmit = () => {
    if (password.trim().toLowerCase() === 'midtown') {
      try {
        window.localStorage.setItem('ee_access_ok', '1')
      } catch {}
      setAuthorized(true)
      setError('')
      return
    }
    setError('Contraseña incorrecta')
  }

  if (!ready) {
    // Prevent content flash before hydration
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
    )
  }

  return (
    <>
      {!authorized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass w-[min(520px,92vw)] rounded-xl p-6 bg-zinc-900/80 border border-white/10 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Acceso</h2>
            <p className="text-sm text-zinc-300 mt-1">Ingresa la clave para continuar.</p>
            <div className="mt-4 flex gap-2">
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                className="flex-1 h-10 rounded-md bg-zinc-800 text-zinc-100 px-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Contraseña"
                autoComplete="off"
                aria-label="Contraseña"
              />
              <Button className="h-10 px-4" onClick={handleSubmit}>Entrar</Button>
            </div>
            {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
          </div>
        </div>
      )}
      {/* App content */}
      <div aria-hidden={!authorized}>{children}</div>
    </>
  )
}


