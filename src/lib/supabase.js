import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// Antes de o cliente processar o link do email, verificamos se é um convite
// ou recuperação de palavra-passe, para pedir ao utilizador uma nova palavra-passe.
const hash = typeof window !== 'undefined' ? window.location.hash : ''
export const arrivedFromEmailLink = /type=(invite|recovery)/.test(hash)

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
