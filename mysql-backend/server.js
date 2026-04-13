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
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ limit: '50gb', extended: true }));

// ─── Static file serving (uploaded images) ─
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Multer setup (images) ────────────────
const imageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const prefix = req.body.courseName ? req.body.courseName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'image';
        cb(null, `${prefix}_${uuidv4().substring(0, 8)}${ext}`);
    },
});
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

// ─── Multer setup (videos) ────────────────
const videoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const prefix = req.body.courseName ? req.body.courseName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'video';
        cb(null, `${prefix}_${uuidv4().substring(0, 8)}${ext}`);
    },
});
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Only video files are allowed'));
    },
});

// ─── Image Upload Route (for course images) ─
app.post('/upload/image', requireAuth, requireAdmin, (req, res) => {
    uploadImage.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
        const publicUrl = `${API_URL}/uploads/images/${req.file.filename}`;
        return res.json({ data: { publicUrl }, error: null });
    });
});

// ─── Video Upload Route (for module videos) ─
app.post('/upload/video', requireAuth, requireAdmin, (req, res) => {
    uploadVideo.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
        const publicUrl = `${API_URL}/uploads/videos/${req.file.filename}`;
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
