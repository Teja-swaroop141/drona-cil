const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./src/db');

async function createAdmin() {
    // --- CONFIGURE YOUR ADMIN CREDENTIALS HERE ---
    const adminEmail = 'admin123@gmail.com';
    const adminPassword = 'password';
    const adminName = 'System Admin';
    // ----------------------------------------------

    console.log(`🚀 Starting admin creation for: ${adminEmail}...`);

    try {
        // 1. Check if user already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        if (existing.length > 0) {
            console.error('❌ Error: User with this email already exists.');
            process.exit(1);
        }

        // 2. Hash password
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        const userId = uuidv4();

        // 3. Insert into users table
        await pool.query(
            'INSERT INTO users (id, email, password_hash, email_confirmed_at) VALUES (?, ?, ?, NOW())',
            [userId, adminEmail, passwordHash]
        );
        console.log('✅ User record created.');

        // 4. Insert into profiles table
        await pool.query(
            'INSERT INTO profiles (id, name, email, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [userId, adminName, adminEmail, 'System', 'Admin']
        );
        console.log('✅ Profile record created.');

        // 5. Insert into user_roles table as 'admin'
        await pool.query(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [uuidv4(), userId, 'admin']
        );
        console.log('✅ Admin role assigned.');

        console.log('\n✨ Admin user created successfully!');
        console.log('-----------------------------------');
        console.log(`Email:    ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log('-----------------------------------');
        console.log('You can now log in with these credentials.');

    } catch (error) {
        console.error('❌ Failed to create admin user:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createAdmin();
