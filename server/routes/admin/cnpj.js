/**
 * Consulta de CNPJ pro cadastro de cliente no admin.
 * A busca em si (cache, normalização) fica em `server/lib/cnpj-lookup.js`, compartilhada
 * com o checkout do link público.
 */
import { Router } from 'express'
import { lookupCnpj, CnpjLookupError } from '../../lib/cnpj-lookup.js'

const router = Router()

/* GET /api/admin/cnpj/:cnpj */
router.get('/:cnpj', async (req, res) => {
  try {
    res.json(await lookupCnpj(req.params.cnpj))
  } catch (err) {
    if (err instanceof CnpjLookupError) return res.status(err.status).json({ error: err.message })
    res.status(504).json({ error: 'Não deu pra consultar o CNPJ agora.' })
  }
})

export default router
