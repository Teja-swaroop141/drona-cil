require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('./src/middleware/auth');

const authRouter = require('./src/routes/auth');
const coursesRouter = require('./src/routes/courses');
const modulesRouter = require('./src/routes/modules');
const enrollmentsRouter = require('./src/routes/enrollments');
const progressRouter = require('./src/routes/progress');
const quizRouter = require('./src/routes/quiz');
const contactRouter = require('./src/routes/contact');
const adminRouter = require('./src/routes/admin');
const roadmapRouter = require('./src/routes/roadmap');
const profilesRouter = require('./src/routes/profiles');

const app = express();
const PORT = process.env.PORT || 4000;

// Allow any localhost port or common IP addresses for local development
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) 
        // or any localhost / IP address for local dev
        if (!origin ||
            /^http:\/\/localhost(:\d+)?$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
            origin === process.env.SITE_URL) {
            callback(null, true);
        } else {
            console.error('CORS blocked origin:', origin);
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
}));

// ─── Body Parser ─────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static file serving (uploaded images) ─
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Multer setup ─────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

// ─── Image Upload Route (for course images) ─
app.post('/upload/image', requireAuth, requireAdmin, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
            }
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
        const publicUrl = `${API_URL}/uploads/${req.file.filename}`;
        return res.json({ data: { publicUrl }, error: null });
    });
});

// ─── Health Check ────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: 'dronacilFV_db', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────
app.use('/auth', authRouter);
app.use('/courses', coursesRouter);
app.use('/modules', modulesRouter);
app.use('/enrollments', enrollmentsRouter);
app.use('/progress', progressRouter);
app.use('/quiz', quizRouter);
app.use('/contact', contactRouter);
app.use('/admin', adminRouter);
app.use('/roadmap', roadmapRouter);
app.use('/profiles', profilesRouter);

// ─── 404 ─────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Error Handler ───────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 MySQL Backend running on http://localhost:${PORT}`);
    console.log(`   Database: ${process.env.DB_NAME || 'dronacilFV_db'}`);
    console.log(`   CORS allows: http://localhost:5173\n`);
});
