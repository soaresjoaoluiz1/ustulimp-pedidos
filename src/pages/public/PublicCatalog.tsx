import { useParams } from 'react-router-dom'
import Catalog from '@/pages/app/Catalog'

/** Catálogo aberto por link: mesma tela do portal, só que sem login e com a tabela do token. */
export default function PublicCatalog() {
  const { token = '' } = useParams()
  return <Catalog key={token} publicToken={token} />
}
