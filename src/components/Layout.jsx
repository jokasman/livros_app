import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BackIcon, BarcodeIcon, SearchIcon, ShelfIcon, UserIcon } from './Icons.jsx'

export default function Layout() {
  return (
    <div className="app">
      <main className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Navegação principal">
        <NavLink to="/" end>
          <ShelfIcon />
          <span>Estante</span>
        </NavLink>
        <NavLink to="/pesquisar">
          <SearchIcon />
          <span>Pesquisar</span>
        </NavLink>
        <NavLink to="/ler" className="tab-scan">
          <BarcodeIcon />
          <span>Ler ISBN</span>
        </NavLink>
        <NavLink to="/conta">
          <UserIcon />
          <span>Conta</span>
        </NavLink>
      </nav>
    </div>
  )
}

/** Cabeçalho de página com botão "voltar" opcional. */
export function PageHeader({ title, back = false, children }) {
  const navigate = useNavigate()
  const goBack = () => {
    // Se a página foi aberta diretamente (sem histórico na app), volta à estante.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }
  return (
    <header className="page-header">
      {back && (
        <button type="button" className="icon-btn" onClick={goBack} aria-label="Voltar">
          <BackIcon />
        </button>
      )}
      <h1>{title}</h1>
      <div className="page-header-actions">{children}</div>
    </header>
  )
}
