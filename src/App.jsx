import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase.js'
import { AuthProvider, useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import SetPassword from './pages/SetPassword.jsx'
import Shelf from './pages/Shelf.jsx'
import Search from './pages/Search.jsx'
import Scan from './pages/Scan.jsx'
import IsbnLookup from './pages/IsbnLookup.jsx'
import AddFromSearch from './pages/AddFromSearch.jsx'
import ManualEntry from './pages/ManualEntry.jsx'
import BookDetail from './pages/BookDetail.jsx'
import Account from './pages/Account.jsx'
import Suggestions from './pages/Suggestions.jsx'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  if (!isConfigured) return <ConfigMissing />
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}

function Gate() {
  const { loading, session, needsPassword } = useAuth()
  if (loading) return <div className="splash">A carregar…</div>
  if (!session) return <Login />
  if (needsPassword) return <SetPassword />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Shelf />} />
        <Route path="pesquisar" element={<Search />} />
        <Route path="ler" element={<Scan />} />
        <Route path="isbn/:isbn" element={<IsbnLookup />} />
        <Route path="adicionar" element={<AddFromSearch />} />
        <Route path="manual" element={<ManualEntry />} />
        <Route path="livro/:id" element={<BookDetail />} />
        <Route path="conta" element={<Account />} />
        <Route path="sugestoes" element={<Suggestions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function ConfigMissing() {
  return (
    <main className="auth-page">
      <div className="card">
        <h1>Configuração em falta</h1>
        <p>
          Define as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{' '}
          (ficheiro <code>.env.local</code> ou variáveis do repositório no GitHub) e volta a
          compilar a app. Vê o README.
        </p>
      </div>
    </main>
  )
}
