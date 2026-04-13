/**
 * delete_demo_data.js - Script to delete the demo user and demo course from all tables.
 * Run: node delete_demo_data.js
 */
require('dotenv').config();
const pool = require('./src/db');

async function deleteDemoData() {
    console.log('🗑️  Starting demo user and course deletion...\n');

    const DEMO_EMAIL = 'demo@dronaciil.com';
    const COURSE_TITLE = 'Introduction to Hindi Language';

    try {
        // ── 1. Delete Demo User & Associated Data ───────────────────────
        console.log(`Checking for demo user with email: ${DEMO_EMAIL}`);
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [DEMO_EMAIL]);

        if (users.length > 0) {
            const userId = users[0].id;
            console.log(`Found demo user (ID: ${userId}). Deleting associated data...`);

            // Delete progress and enrollments
            await pool.query('DELETE FROM user_module_progress WHERE user_id = ?', [userId]);
            await pool.query('DELETE FROM user_enrollments WHERE user_id = ?', [userId]);
            await pool.query('DELETE FROM quiz_attempts WHERE user_id = ?', [userId]);
            
            // Delete roles and profile
            await pool.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
            await pool.query('DELETE FROM profiles WHERE id = ?', [userId]);
            
            // Delete user record
            await pool.query('DELETE FROM users WHERE id = ?', [userId]);
            
            console.log(`✅ Successfully deleted demo user and associated data.`);
        } else {
            console.log(`ℹ️  Demo user not found. Skipping user deletion.`);
        }

        // ── 2. Delete Demo Course & Associated Data ─────────────────────
        console.log(`\nChecking for demo course: "${COURSE_TITLE}"`);
        const [courses] = await pool.query('SELECT id FROM courses WHERE title = ?', [COURSE_TITLE]);

        if (courses.length > 0) {
            const courseId = courses[0].id;
            console.log(`Found course (ID: ${courseId}). Deleting associated data...`);

            // Due to CASCADE ON DELETE, deleting the course will automatically delete:
            // - course_modules
            // - course_roadmap_items
            // - user_enrollments
            // - user_module_progress (cascading from course_modules)
            // - quiz_questions
            // - quiz_attempts
            
            // Delete course record
            await pool.query('DELETE FROM courses WHERE id = ?', [courseId]);

            console.log(`✅ Successfully deleted demo course and associated data.`);
        } else {
            console.log(`ℹ️  Demo course not found. Skipping course deletion.`);
        }

        console.log('\n✨ Cleanup complete!\n');

    } catch (err) {
        console.error('❌ Deletion failed:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

deleteDemoData();
