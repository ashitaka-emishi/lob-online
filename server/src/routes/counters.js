import { readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const COUNTERS_DIR = join(__dirname, '../../../client/public/counters');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png']);
const MAX_FILE_SIZE = 500 * 1024; // 500 KB

mkdirSync(COUNTERS_DIR, { recursive: true });

const router = Router();

const countersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(countersLimiter);

function fileFilter(_req, file, cb) {
  const ext = extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); // reject without error — we check req.file below
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

router.get('/list', (_req, res) => {
  const files = readdirSync(COUNTERS_DIR).filter((f) => {
    const ext = extname(f).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
  });
  res.json(files);
});

router.post('/upload', (req, res) => {
  upload.single('counter')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ ok: false, message: 'File exceeds 500 KB limit' });
    }
    if (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No valid image file provided' });
    }
    const safeFilename = basename(req.file.originalname);
    writeFileSync(join(COUNTERS_DIR, safeFilename), req.file.buffer);
    res.json({ ok: true, filename: safeFilename });
  });
});

export default router;
