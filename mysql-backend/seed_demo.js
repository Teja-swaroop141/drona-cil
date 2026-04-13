/**
 * seed_demo.js — Creates a demo account + a complete course with modules & quiz
 * Run: node seed_demo.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./src/db');

async function seed() {
    console.log('🌱 Starting demo seed...\n');

    // ── Demo User credentials ─────────────────────────────────────
    const DEMO_EMAIL    = 'demo@dronaciil.com';
    const DEMO_PASSWORD = 'Demo@1234';
    const DEMO_NAME     = 'Demo Student';

    // ── Admin credentials (creates if not exists) ──────────────────
    const ADMIN_EMAIL    = 'admin@dronaciil.com';
    const ADMIN_PASSWORD = 'Admin@1234';

    try {
        // ────────────────────────────────────────────────────────────
        // 1. Create demo user
        // ────────────────────────────────────────────────────────────
        const [existingDemo] = await pool.query('SELECT id FROM users WHERE email = ?', [DEMO_EMAIL]);
        let demoUserId;
        if (existingDemo.length > 0) {
            demoUserId = existingDemo[0].id;
            console.log(`ℹ️  Demo user already exists (${DEMO_EMAIL}). Skipping creation.`);
        } else {
            demoUserId = uuidv4();
            const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
            await pool.query(
                'INSERT INTO users (id, email, password_hash, email_confirmed_at) VALUES (?, ?, ?, NOW())',
                [demoUserId, DEMO_EMAIL, hash]
            );
            await pool.query(
                `INSERT INTO profiles (id, name, email, first_name, last_name, designation, prefix)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [demoUserId, DEMO_NAME, DEMO_EMAIL, 'Demo', 'Student', 'Student', 'Mr']
            );
            await pool.query(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
                [uuidv4(), demoUserId, 'user']
            );
            console.log(`✅ Demo user created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
        }

        // ────────────────────────────────────────────────────────────
        // 2. Create admin user (if missing)
        // ────────────────────────────────────────────────────────────
        const [existingAdmin] = await pool.query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
        if (existingAdmin.length > 0) {
            console.log(`ℹ️  Admin user already exists (${ADMIN_EMAIL}). Skipping.`);
        } else {
            const adminId = uuidv4();
            const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
            await pool.query(
                'INSERT INTO users (id, email, password_hash, email_confirmed_at) VALUES (?, ?, ?, NOW())',
                [adminId, ADMIN_EMAIL, adminHash]
            );
            await pool.query(
                `INSERT INTO profiles (id, name, email, first_name, last_name, designation, prefix)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [adminId, 'Admin User', ADMIN_EMAIL, 'Admin', 'User', 'Administrator', 'Mr']
            );
            await pool.query(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
                [uuidv4(), adminId, 'admin']
            );
            console.log(`✅ Admin user created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        }

        // ────────────────────────────────────────────────────────────
        // 3. Create a demo course (skip if already seeded)
        // ────────────────────────────────────────────────────────────
        const COURSE_TITLE = 'Introduction to Hindi Language';
        const [existingCourse] = await pool.query('SELECT id FROM courses WHERE title = ?', [COURSE_TITLE]);
        let courseId;

        if (existingCourse.length > 0) {
            courseId = existingCourse[0].id;
            console.log(`ℹ️  Demo course already exists. Skipping course creation.`);
        } else {
            courseId = uuidv4();
            await pool.query(
                `INSERT INTO courses (id, title, description, image_url, instructor, duration, level, category, price, rating)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    courseId,
                    COURSE_TITLE,
                    'A comprehensive beginner course to learn Hindi — India\'s official language. Covers script, vocabulary, grammar and conversational phrases.',
                    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800',
                    'Prof. Ramesh Kumar',
                    '4 hours',
                    'beginner',
                    'Language',
                    0,
                    4.8,
                ]
            );
            console.log(`✅ Course created: "${COURSE_TITLE}"`);

            // ── 3a. Modules ───────────────────────────────────────────
            const modules = [
                {
                    id: uuidv4(),
                    title: 'Introduction to Devanagari Script',
                    description: 'Learn the basics of the Devanagari alphabet used in Hindi writing.',
                    order_number: 1,
                    duration: '45 min',
                    is_preview: 1,
                    // YouTube video
                    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    has_quiz: 0,
                },
                {
                    id: uuidv4(),
                    title: 'Basic Vocabulary & Greetings',
                    description: 'Essential Hindi words and common greeting phrases used in daily conversations.',
                    order_number: 2,
                    duration: '30 min',
                    is_preview: 0,
                    // YouTube short URL
                    video_url: 'https://youtu.be/jNQXAC9IVRw',
                    has_quiz: 0,
                },
                {
                    id: uuidv4(),
                    title: 'Numbers, Colors & Common Objects',
                    description: 'Learn numbers 1–100, basic colors, and common nouns in Hindi.',
                    order_number: 3,
                    duration: '40 min',
                    is_preview: 0,
                    // YouTube embed URL
                    video_url: 'https://www.youtube.com/embed/tgbNymZ7vqY',
                    has_quiz: 0,
                },
            ];

            // Quiz-only final assessment module
            const quizModuleId = uuidv4();
            const quizModule = {
                id: quizModuleId,
                title: 'Final Assessment',
                description: 'Test your knowledge of Hindi basics. Score 70% or more to earn your certificate.',
                order_number: 4,
                duration: '20 min',
                is_preview: 0,
                video_url: null,
                has_quiz: 1,
                pass_percentage: 70,
                total_questions: 5,
                requires_passing: 1,
                allow_retries: 1,
                show_score_after_submission: 1,
            };

            // Insert content modules
            for (const m of modules) {
                await pool.query(
                    `INSERT INTO course_modules 
                     (id, course_id, title, description, order_number, duration, is_preview, video_url, has_quiz)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [m.id, courseId, m.title, m.description, m.order_number, m.duration, m.is_preview, m.video_url, m.has_quiz]
                );
                console.log(`  ✅ Module ${m.order_number}: "${m.title}"`);
            }

            // Insert quiz module
            await pool.query(
                `INSERT INTO course_modules 
                 (id, course_id, title, description, order_number, duration, is_preview, video_url, 
                  has_quiz, pass_percentage, total_questions, requires_passing, allow_retries, show_score_after_submission)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quizModule.id, courseId, quizModule.title, quizModule.description,
                    quizModule.order_number, quizModule.duration, quizModule.is_preview, quizModule.video_url,
                    quizModule.has_quiz, quizModule.pass_percentage, quizModule.total_questions,
                    quizModule.requires_passing, quizModule.allow_retries, quizModule.show_score_after_submission,
                ]
            );
            console.log(`  ✅ Module 4: "Final Assessment" (Quiz-only)`);

            // ── 3b. Quiz Questions ────────────────────────────────────
            const questions = [
                {
                    question_text: 'What is the Hindi word for "Hello" / greeting?',
                    option_a: 'Dhanyavaad',
                    option_b: 'Namaste',
                    option_c: 'Alvida',
                    option_d: 'Shukriya',
                    correct_answer: 'B',
                    order_number: 1,
                },
                {
                    question_text: 'Which script is used to write Hindi?',
                    option_a: 'Latin',
                    option_b: 'Arabic',
                    option_c: 'Devanagari',
                    option_d: 'Gurmukhi',
                    correct_answer: 'C',
                    order_number: 2,
                },
                {
                    question_text: 'What does "Dhanyavaad" (धन्यवाद) mean in English?',
                    option_a: 'Good morning',
                    option_b: 'Goodbye',
                    option_c: 'Please',
                    option_d: 'Thank you',
                    correct_answer: 'D',
                    order_number: 3,
                },
                {
                    question_text: 'How do you say "Water" in Hindi?',
                    option_a: 'Paani (पानी)',
                    option_b: 'Roti (रोटी)',
                    option_c: 'Phool (फूल)',
                    option_d: 'Kitaab (किताब)',
                    correct_answer: 'A',
                    order_number: 4,
                },
                {
                    question_text: 'Hindi is the official language of which country?',
                    option_a: 'Pakistan',
                    option_b: 'Nepal',
                    option_c: 'Bangladesh',
                    option_d: 'India',
                    correct_answer: 'D',
                    order_number: 5,
                },
            ];

            for (const q of questions) {
                await pool.query(
                    `INSERT INTO quiz_questions 
                     (id, module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_number)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [uuidv4(), quizModuleId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.order_number]
                );
            }
            console.log(`  ✅ 5 quiz questions created`);
        }

        // ─────────────────────────────────────────────────────────────
        console.log('\n✨ Seed complete!\n');
        console.log('═══════════════════════════════════════════════════');
        console.log('  DEMO ACCOUNT (Student)');
        console.log(`  Email:    ${DEMO_EMAIL}`);
        console.log(`  Password: ${DEMO_PASSWORD}`);
        console.log('───────────────────────────────────────────────────');
        console.log('  ADMIN ACCOUNT');
        console.log(`  Email:    ${ADMIN_EMAIL}`);
        console.log(`  Password: ${ADMIN_PASSWORD}`);
        console.log('═══════════════════════════════════════════════════');
        console.log('\n📖 Demo flow:');
        console.log('  1. Go to http://localhost:5173/auth');
        console.log(`  2. Login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
        console.log('  3. Click on "Introduction to Hindi Language"');
        console.log('  4. Click "Enroll Now"');
        console.log('  5. Watch each module video (click play, wait for completion)');
        console.log('  6. Take the Final Assessment quiz (answer B,C,D,A,D to pass 100%)');
        console.log('  7. Download your certificate! 🎓\n');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seed();
