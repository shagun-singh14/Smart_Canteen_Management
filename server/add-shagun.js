const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // 1. Make role flexible VARCHAR(50) so 'Chef', 'Head Chef', 'Cook' all work!
    await conn.query("ALTER TABLE kitchen_staff MODIFY COLUMN role VARCHAR(50) DEFAULT 'Chef';");
    console.log("✓ Role column modified to accept any text ('Chef', 'Head Chef', etc.)");

    // 2. Add Shagun Singh to students
    await conn.query(`
        INSERT INTO students (reg_no, full_name, email, phone, wallet_balance)
        VALUES ('24BCY10379', 'Shagun Singh', 'shagun.24bcy10379@vitbhopal.ac.in', '9876543210', 1000.00)
        ON DUPLICATE KEY UPDATE full_name = 'Shagun Singh', wallet_balance = 1000.00;
    `);
    console.log("✓ Added 'shagun.24bcy10379@vitbhopal.ac.in' to students table with ₹1000 balance");

    // 3. Add Shagun Singh to kitchen_staff
    await conn.query(`
        INSERT INTO kitchen_staff (full_name, email, role, is_active)
        VALUES ('Shagun Singh', 'shagun.24bcy10379@vitbhopal.ac.in', 'Head Chef', TRUE)
        ON DUPLICATE KEY UPDATE full_name = 'Shagun Singh', role = 'Head Chef', is_active = TRUE;
    `);
    console.log("✓ Added 'shagun.24bcy10379@vitbhopal.ac.in' to kitchen_staff table as Head Chef");

    const [students] = await conn.query("SELECT * FROM students WHERE email LIKE '%shagun%'");
    console.log("Students:", students);

    const [staff] = await conn.query("SELECT * FROM kitchen_staff WHERE email LIKE '%shagun%'");
    console.log("Staff:", staff);

    await conn.end();
}

main().catch(console.error);
