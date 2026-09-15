const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let isConnectedToMySQL = false;
let connectionError = null;

// Current configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'canteen_db',
    multipleStatements: true
};

// In-memory mock store for instant testing if MySQL credentials are pending
let mockDb = {
    students: [
        { student_id: 1, reg_no: '23BCE1001', full_name: 'Aarav Sharma', email: 'aarav.sharma@vitstudent.ac.in', phone: '9876543210', wallet_balance: 450.00 },
        { student_id: 2, reg_no: '23BCE1045', full_name: 'Ananya Iyer', email: 'ananya.iyer@vitstudent.ac.in', phone: '9876543211', wallet_balance: 820.00 },
        { student_id: 3, reg_no: '23BCE1120', full_name: 'Rohan Verma', email: 'rohan.verma@vitstudent.ac.in', phone: '9876543212', wallet_balance: 310.00 },
        { student_id: 4, reg_no: '23BCE1289', full_name: 'Sneha Patel', email: 'sneha.patel@vitstudent.ac.in', phone: '9876543213', wallet_balance: 950.00 }
    ],
    kitchen_staff: [
        { staff_id: 1, full_name: 'Chef Ramesh Kumar', email: 'chef.ramesh@canteen.vit.ac.in', role: 'Head Chef', is_active: true },
        { staff_id: 2, full_name: 'Suresh Canteen Manager', email: 'manager@canteen.vit.ac.in', role: 'Canteen Manager', is_active: true },
        { staff_id: 3, full_name: 'Priya Cook', email: 'cook.priya@canteen.vit.ac.in', role: 'Cook', is_active: true }
    ],
    categories: [
        { category_id: 1, category_name: 'South Indian', description: 'Crispy dosas, fluffy idlis, sambar' },
        { category_id: 2, category_name: 'North Indian', description: 'Rich curries, biryani, butter masala' },
        { category_id: 3, category_name: 'Snacks & Fast Food', description: 'Quick bites, burgers, samosas' },
        { category_id: 4, category_name: 'Beverages', description: 'Filter coffee, masala chai, lassi' }
    ],
    menu_items: [
        { item_id: 1, category_id: 1, category_name: 'South Indian', item_name: 'Masala Dosa', price: 60.00, prep_time: 8, is_available: true, description: 'Crispy golden crepe filled with spiced potatoes, coconut chutney & sambar' },
        { item_id: 2, category_id: 1, category_name: 'South Indian', item_name: 'Plain Dosa', price: 45.00, prep_time: 6, is_available: true, description: 'Classic thin crepe served with fresh chutneys and sambar' },
        { item_id: 3, category_id: 1, category_name: 'South Indian', item_name: 'Idli Sambar (2 pcs)', price: 40.00, prep_time: 5, is_available: true, description: 'Steamed fluffy rice-lentil cakes soaked in aromatic lentil sambar' },
        { item_id: 4, category_id: 2, category_name: 'North Indian', item_name: 'Veg Biryani', price: 110.00, prep_time: 12, is_available: true, description: 'Fragrant basmati rice dum-cooked with vegetables and whole spices' },
        { item_id: 5, category_id: 2, category_name: 'North Indian', item_name: 'Paneer Butter Masala', price: 130.00, prep_time: 15, is_available: true, description: 'Soft paneer cubes in velvety tomato-butter gravy with butter roti' },
        { item_id: 6, category_id: 3, category_name: 'Snacks & Fast Food', item_name: 'Crispy Samosa (2 pcs)', price: 30.00, prep_time: 4, is_available: true, description: 'Flaky pastry stuffed with spiced potatoes and green peas' },
        { item_id: 7, category_id: 3, category_name: 'Snacks & Fast Food', item_name: 'Veggie Burger', price: 70.00, prep_time: 10, is_available: true, description: 'Crispy vegetable patty with fresh lettuce, mayo and toasted bun' },
        { item_id: 8, category_id: 4, category_name: 'Beverages', item_name: 'South Indian Filter Coffee', price: 25.00, prep_time: 3, is_available: true, description: 'Traditional frothed decoction coffee brewed with chicory' },
        { item_id: 9, category_id: 4, category_name: 'Beverages', item_name: 'Masala Chai', price: 20.00, prep_time: 3, is_available: true, description: 'Steaming ginger cardamom tea boiled with cow milk' },
        { item_id: 10, category_id: 4, category_name: 'Beverages', item_name: 'Mango Lassi', price: 50.00, prep_time: 4, is_available: true, description: 'Chilled sweet yogurt smoothie with Alphonso mango puree' }
    ],
    ingredients: [
        { ingredient_id: 1, ingredient_name: 'Dosa Batter', unit: 'grams', current_stock: 8500.00, min_threshold: 2000.00, cost_per_unit: 0.05 },
        { ingredient_id: 2, ingredient_name: 'Spiced Potato Filling', unit: 'grams', current_stock: 3200.00, min_threshold: 1500.00, cost_per_unit: 0.08 },
        { ingredient_id: 3, ingredient_name: 'Cooking Oil', unit: 'ml', current_stock: 4500.00, min_threshold: 1000.00, cost_per_unit: 0.15 },
        { ingredient_id: 4, ingredient_name: 'Aromatic Sambar Gravy', unit: 'ml', current_stock: 6000.00, min_threshold: 2000.00, cost_per_unit: 0.06 },
        { ingredient_id: 5, ingredient_name: 'Basmati Rice', unit: 'grams', current_stock: 9000.00, min_threshold: 2500.00, cost_per_unit: 0.09 },
        { ingredient_id: 6, ingredient_name: 'Paneer (Cottage Cheese)', unit: 'grams', current_stock: 2500.00, min_threshold: 1000.00, cost_per_unit: 0.40 },
        { ingredient_id: 7, ingredient_name: 'Burger Buns', unit: 'pieces', current_stock: 45.00, min_threshold: 15.00, cost_per_unit: 6.00 },
        { ingredient_id: 8, ingredient_name: 'Veg Patty', unit: 'pieces', current_stock: 38.00, min_threshold: 15.00, cost_per_unit: 14.00 },
        { ingredient_id: 9, ingredient_name: 'Fresh Cow Milk', unit: 'ml', current_stock: 9500.00, min_threshold: 3000.00, cost_per_unit: 0.06 },
        { ingredient_id: 10, ingredient_name: 'Coffee Decoction/Powder', unit: 'grams', current_stock: 1200.00, min_threshold: 300.00, cost_per_unit: 0.60 },
        { ingredient_id: 11, ingredient_name: 'Assam Tea Leaves', unit: 'grams', current_stock: 800.00, min_threshold: 250.00, cost_per_unit: 0.45 },
        { ingredient_id: 12, ingredient_name: 'Granulated Sugar', unit: 'grams', current_stock: 4000.00, min_threshold: 1000.00, cost_per_unit: 0.04 },
        { ingredient_id: 13, ingredient_name: 'Fresh Yogurt/Curd', unit: 'ml', current_stock: 3500.00, min_threshold: 1000.00, cost_per_unit: 0.07 }
    ],
    recipes: {
        1: [{ ingredient_id: 1, qty: 150 }, { ingredient_id: 2, qty: 100 }, { ingredient_id: 3, qty: 15 }], // Masala Dosa
        2: [{ ingredient_id: 1, qty: 150 }, { ingredient_id: 3, qty: 10 }], // Plain Dosa
        3: [{ ingredient_id: 1, qty: 180 }, { ingredient_id: 4, qty: 150 }], // Idli Sambar
        4: [{ ingredient_id: 5, qty: 200 }, { ingredient_id: 3, qty: 20 }, { ingredient_id: 4, qty: 80 }], // Veg Biryani
        5: [{ ingredient_id: 6, qty: 150 }, { ingredient_id: 3, qty: 25 }, { ingredient_id: 4, qty: 120 }], // Paneer Butter Masala
        6: [{ ingredient_id: 2, qty: 120 }, { ingredient_id: 3, qty: 30 }], // Samosa
        7: [{ ingredient_id: 7, qty: 1 }, { ingredient_id: 8, qty: 1 }, { ingredient_id: 3, qty: 10 }], // Veg Burger
        8: [{ ingredient_id: 9, qty: 150 }, { ingredient_id: 10, qty: 15 }, { ingredient_id: 12, qty: 15 }], // Coffee
        9: [{ ingredient_id: 9, qty: 120 }, { ingredient_id: 11, qty: 10 }, { ingredient_id: 12, qty: 15 }], // Chai
        10: [{ ingredient_id: 13, qty: 200 }, { ingredient_id: 12, qty: 25 }] // Mango Lassi
    },
    orders: [
        {
            order_id: 101,
            student_id: 1,
            student_name: 'Aarav Sharma',
            reg_no: '23BCE1001',
            status: 'Picked Up',
            total_amount: 120.00,
            special_instructions: 'Extra crispy dosa',
            order_date: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
            items: [{ item_id: 1, item_name: 'Masala Dosa', quantity: 2, unit_price: 60.00, subtotal: 120.00 }]
        },
        {
            order_id: 102,
            student_id: 2,
            student_name: 'Ananya Iyer',
            reg_no: '23BCE1045',
            status: 'Ready',
            total_amount: 135.00,
            special_instructions: 'Less spicy biryani',
            order_date: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            items: [
                { item_id: 4, item_name: 'Veg Biryani', quantity: 1, unit_price: 110.00, subtotal: 110.00 },
                { item_id: 8, item_name: 'South Indian Filter Coffee', quantity: 1, unit_price: 25.00, subtotal: 25.00 }
            ]
        },
        {
            order_id: 103,
            student_id: 3,
            student_name: 'Rohan Verma',
            reg_no: '23BCE1120',
            status: 'Preparing',
            total_amount: 90.00,
            special_instructions: 'Fast please, class at 2:30',
            order_date: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            items: [
                { item_id: 6, item_name: 'Crispy Samosa (2 pcs)', quantity: 3, unit_price: 30.00, subtotal: 90.00 }
            ]
        },
        {
            order_id: 104,
            student_id: 4,
            student_name: 'Sneha Patel',
            reg_no: '23BCE1289',
            status: 'Placed',
            total_amount: 150.00,
            special_instructions: 'No onions in paneer',
            order_date: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            items: [
                { item_id: 5, item_name: 'Paneer Butter Masala', quantity: 1, unit_price: 130.00, subtotal: 130.00 },
                { item_id: 9, item_name: 'Masala Chai', quantity: 1, unit_price: 20.00, subtotal: 20.00 }
            ]
        }
    ],
    feedback: [
        { feedback_id: 1, order_id: 101, rating: 5, comments: 'Best crispy Masala Dosa on campus! Chutney was fresh.', student_name: 'Aarav Sharma' },
        { feedback_id: 2, order_id: 102, rating: 4, comments: 'Good filter coffee and biryani combo.', student_name: 'Ananya Iyer' }
    ],
    inventoryLogs: []
};

// Initialize or test connection to MySQL
async function initDatabase(credentials = null) {
    if (credentials) {
        if (credentials.password !== undefined) dbConfig.password = credentials.password;
        if (credentials.user) dbConfig.user = credentials.user;
        if (credentials.host) dbConfig.host = credentials.host;
        if (credentials.port) dbConfig.port = parseInt(credentials.port, 10);
    }

    try {
        // Step 1: Connect to server without database to ensure DB exists
        const rootConn = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password
        });

        console.log('✅ Connected to MySQL server successfully!');
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConn.end();

        // Step 2: Create connection pool with the database
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Run migrations/tables if not present
        await runSqlScripts();

        isConnectedToMySQL = true;
        connectionError = null;
        console.log(`🚀 MySQL Connected & Initialized database '${dbConfig.database}'`);
        return { success: true, mode: 'mysql' };
    } catch (err) {
        isConnectedToMySQL = false;
        connectionError = err.message;
        console.warn(`⚠️ MySQL Connection note: ${err.message}`);
        console.log('ℹ️ Running in resilient demo mode (Local mock engine active). You can connect to MySQL anytime via UI Settings.');
        return { success: false, mode: 'mock', error: err.message };
    }
}

// Execute migration SQL files into MySQL
async function runSqlScripts() {
    if (!pool) return;
    try {
        const dbDir = path.join(__dirname, '..', 'database');
        const files = [
            '01_schema.sql',
            '02_seed_data.sql',
            '03_procedures_and_triggers.sql',
            '05_analytics_views_queries.sql'
        ];

        // Check if tables already exist
        const [tables] = await pool.query('SHOW TABLES');
        if (tables.length > 5) {
            console.log('ℹ️ MySQL database already populated with tables.');
            return;
        }

        console.log('📦 Executing database migration scripts...');
        for (const file of files) {
            const filePath = path.join(dbDir, file);
            if (fs.existsSync(filePath)) {
                let sql = fs.readFileSync(filePath, 'utf8');
                // Clean DELIMITER statements for mysql2
                sql = sql.replace(/DELIMITER\s+\/\//g, '').replace(/DELIMITER\s+;/g, '').replace(/\/\/\s*$/gm, ';');
                try {
                    await pool.query(sql);
                    console.log(`  ✓ Loaded ${file}`);
                } catch (sqlErr) {
                    console.warn(`  ⚠️ Notice in ${file}: ${sqlErr.message}`);
                }
            }
        }
    } catch (err) {
        console.warn('Migration runner note:', err.message);
    }
}

// Get DB Status
function getDbStatus() {
    return {
        isConnected: isConnectedToMySQL,
        mode: isConnectedToMySQL ? 'Live MySQL 8.0' : 'Demo Mode (Mock Database Active)',
        error: connectionError,
        config: {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            database: dbConfig.database,
            hasPassword: Boolean(dbConfig.password)
        }
    };
}

module.exports = {
    initDatabase,
    getDbStatus,
    getPool: () => pool,
    isLive: () => isConnectedToMySQL,
    mockDb,
    dbConfig
};
