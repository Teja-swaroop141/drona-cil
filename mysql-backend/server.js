require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// ─── CORS ───────────────────────────────
// Allow any localhost port (Vite may pick 5173, 8081, etc.)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === process.env.SITE_URL) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
}));

// ─── Body Parser ─────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
