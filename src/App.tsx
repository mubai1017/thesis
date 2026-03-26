import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import type { User } from '@supabase/supabase-js'
import ThesisCheckRecords from './components/ThesisCheckRecords'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Thesis Web App</h1>
        <div className="user-info">
          {user ? (
            <>
              <span>{user.email}</span>
              <button onClick={handleSignOut}>Sign Out</button>
            </>
          ) : (
            <Auth compact />
          )}
        </div>
      </header>

      <main className="app-main">
        <section className="thesis-section">
          <h2>Thesis Check Records</h2>
          <p>
            {user
              ? 'Upload and view thesis check markdown files. Organize by person with chronological history.'
              : 'View thesis check markdown files. Login to upload new records.'}
          </p>
          <ThesisCheckRecords />
        </section>
      </main>
    </div>
  )
}

export default App
