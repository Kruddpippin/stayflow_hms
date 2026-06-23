import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!active) return
        setSession(data.session)
        await loadProfile(data.session?.user?.id)
      })
      .catch((err) => {
        console.error('Failed to load session:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user?.id)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
  const signOut = () => supabase.auth.signOut()

  const value = {
    session, user: session?.user ?? null, profile, loading,
    role: profile?.role ?? null,
    isStaff: ['admin', 'manager', 'staff'].includes(profile?.role),
    isAdmin: profile?.role === 'admin' || profile?.role === 'manager',
    signIn, signUp, signOut, refreshProfile: () => loadProfile(session?.user?.id),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
