import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

interface AuthProps {
  compact?: boolean
}

export default function Auth({ compact = false }: AuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const compactRef = useRef<HTMLDivElement>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setShowForm(false)
      }
    } catch (error: unknown) {
      const err = error as { message: string }
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setMessage('Please enter your email')
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      setMessage('Check your email for the magic link!')
    } catch (error: unknown) {
      const err = error as { message: string }
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Compact mode for header login button
  if (compact) {
    return (
      <div className="auth-compact" ref={compactRef}>
        {showForm ? (
          <div className="auth-dropdown">
            <form onSubmit={handleAuth} className="auth-form-compact">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? '...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="magic-link-btn"
              >
                Magic Link
              </button>
            </form>
          </div>
        ) : (
          <button className="login-btn" onClick={() => setShowForm(true)}>
            Sign In
          </button>
        )}
      </div>
    )
  }

  // Close dropdown when clicking outside (compact mode only)
  useEffect(() => {
    if (!compact || !showForm) return

    const handleClickOutside = (event: MouseEvent) => {
      if (compactRef.current && !compactRef.current.contains(event.target as Node)) {
        setShowForm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [compact, showForm])

  // Full mode
  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>

      <form onSubmit={handleAuth} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
          />
        </div>

        <button type="submit" disabled={loading} className="auth-button">
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading}
          className="magic-link-button"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.includes('error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="auth-toggle">
        <span>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setMessage(null)
          }}
          className="toggle-button"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </div>
    </div>
  )
}
