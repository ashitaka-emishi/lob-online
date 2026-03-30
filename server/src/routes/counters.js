import { readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import multer from 'multer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const COUNTERS_DIR = join(__dirname, '../../../client/public/counters');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const MAX_FILE_SIZE = 500 * 1024; // 500 KB

const router = Router();

function fileFilter(_req, file, cb) {
  const ext = extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
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
  mkdirSync(COUNTERS_DIR, { recursive: true });
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
    mkdirSync(COUNTERS_DIR, { recursive: true });
    writeFileSync(join(COUNTERS_DIR, req.file.originalname), req.file.buffer);
    res.json({ ok: true, filename: req.file.originalname });
  });
});

export default router;
