import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, resolve, extname } from 'path'
import { mkdirSync, existsSync, unlinkSync } from 'fs'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = resolve(__dirname, '..', '..', 'data', 'uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = (extname(file.originalname) || '.jpg').toLowerCase()
    const safeExt = ext.match(/^\.(jpe?g|png|webp|gif)$/i) ? ext : '.jpg'
    const name = `${Date.now()}-${randomBytes(6).toString('hex')}${safeExt}`
    cb(null, name)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Apenas imagens JPG/PNG/WEBP/GIF (máx 5MB)'))
    }
    cb(null, true)
  }
})

const router = Router()

/* POST /api/admin/upload — campo `file` (multipart/form-data)
   Retorna { url: "/uploads/xxx.jpg" } pra usar como image_url do produto.
*/
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  const url = `/uploads/${req.file.filename}`
  res.json({
    url,
    filename: req.file.filename,
    size: req.file.size,
    mime: req.file.mimetype
  })
})

/* DELETE /api/admin/upload/:filename — remove arquivo (se admin trocar imagem) */
router.delete('/:filename', (req, res) => {
  const filename = req.params.filename
  if (!/^[\w\-.]+$/.test(filename)) return res.status(400).json({ error: 'Nome inválido' })
  const filePath = resolve(UPLOADS_DIR, filename)
  if (!filePath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Path inválido' })
  if (!existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' })
  unlinkSync(filePath)
  res.json({ ok: true })
})

/* Error handler do multer (precisa estar montado APÓS as routes) */
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message })
  next()
})

export { UPLOADS_DIR }
export default router
