import { Navigate, useLocation } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import AddBook from '../components/AddBook.jsx'

export default function AddFromSearch() {
  const { state } = useLocation()
  if (!state?.book) return <Navigate to="/pesquisar" replace />
  return (
    <div className="page">
      <PageHeader title="Livro" back />
      <AddBook book={state.book} />
    </div>
  )
}
