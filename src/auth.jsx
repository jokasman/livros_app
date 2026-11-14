import { createContext, useContext, useEffect, useState } from 'react'
import { arrivedFromEmailLink, supabase } from './lib/supabase.js'
import { clearCache } from './lib/books.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = a carregar
  const [needsPassword, setNeedsPassword] = useState(arrivedFromEmailLink)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      if (event === 'SIGNED_OUT') clearCache()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    needsPassword,
    passwordDone: () => {
      setNeedsPassword(false)
      if (window.location.hash) history.replaceState(null, '', window.location.pathname)
    },
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
