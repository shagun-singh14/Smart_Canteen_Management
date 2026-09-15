const express = require('express');
const router = express.Router();
const { getPool, isLive, mockDb, getDbStatus, initDatabase } = require('./db');

// ------------------------------------------------------------
// 1. SYSTEM & DATABASE CONNECTION STATUS
// ------------------------------------------------------------
router.get('/status', (req, res) => {
    res.json(getDbStatus());
});

router.post('/config/db', async (req, res) => {
    const { host, port, user, password, database } = req.body;
    const result = await initDatabase({ host, port, user, password, database });
    res.json(result);
});

// ------------------------------------------------------------
// 2. GOOGLE / EMAIL DATABASE AUTHENTICATION
// ------------------------------------------------------------
router.post('/auth/google-login', async (req, res) => {
    const { email, portal } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Google email address is required.' });

    const trimmedEmail = email.trim().toLowerCase();

    try {
        if (portal === 'kitchen') {
            if (isLive()) {
                const [rows] = await getPool().query(
                    'SELECT staff_id, full_name, email, role FROM kitchen_staff WHERE LOWER(email) = ? AND is_active = TRUE',
                    [trimmedEmail]
                );
                if (rows.length > 0) {
                    return res.json({ success: true, user: rows[0], portal: 'kitchen' });
                }
            } else {
                const staff = mockDb.kitchen_staff.find(s => s.email.toLowerCase() === trimmedEmail && s.is_active);
                if (staff) {
                    return res.json({ success: true, user: staff, portal: 'kitchen' });
                }
            }
            return res.status(404).json({
                success: false,
                error: `Access Denied: Email '${email}' is not registered in the kitchen_staff database table.`
            });
        }

        // Student Portal Login
        if (isLive()) {
            const [rows] = await getPool().query(
                'SELECT student_id, reg_no, full_name, email, phone, wallet_balance FROM students WHERE LOWER(email) = ?',
                [trimmedEmail]
            );
            if (rows.length > 0) {
                return res.json({ success: true, user: rows[0], portal: 'student' });
            }
        } else {
            const student = mockDb.students.find(s => s.email.toLowerCase() === trimmedEmail);
            if (student) {
                return res.json({ success: true, user: student, portal: 'student' });
            }
        }
        return res.status(404).json({
            success: false,
            error: `Student Email '${email}' not found in the database. Please use a registered student email.`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/kitchen/staff', async (req, res) => {
    try {
        if (isLive()) {
            const [rows] = await getPool().query('SELECT staff_id, full_name, email, role FROM kitchen_staff WHERE is_active = TRUE');
            return res.json(rows);
        }
        res.json(mockDb.kitchen_staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/student/tokens/:student_id', async (req, res) => {
    const studentId = parseInt(req.params.student_id, 10);
    try {
        if (isLive()) {
            const [rows] = await getPool().query(`
                SELECT 
                    o.order_id AS token_no,
                    o.order_id,
                    o.status,
                    o.total_amount,
                    o.order_date,
                    o.special_instructions,
                    GROUP_CONCAT(CONCAT(oi.quantity, 'x ', m.item_name) SEPARATOR ', ') AS item_summary
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN menu_items m ON oi.item_id = m.item_id
                WHERE o.student_id = ?
                GROUP BY o.order_id, o.status, o.total_amount, o.order_date, o.special_instructions
                ORDER BY o.order_id DESC
            `, [studentId]);
            return res.json(rows);
        }

        const studentOrders = mockDb.orders
            .filter(o => o.student_id === studentId)
            .map(o => ({
                token_no: o.order_id,
                order_id: o.order_id,
                status: o.status,
                total_amount: o.total_amount,
                order_date: o.order_date,
                special_instructions: o.special_instructions,
                item_summary: o.items ? o.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ') : 'Canteen items'
            }));
        res.json(studentOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------
// 2. STUDENTS LIST
// ------------------------------------------------------------
router.get('/students', async (req, res) => {
    try {
        if (isLive()) {
            const [rows] = await getPool().query('SELECT * FROM students ORDER BY student_id ASC');
            return res.json(rows);
        }
        res.json(mockDb.students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------
// 3. MENU ITEMS & CATEGORIES (With real-time stock check)
// ------------------------------------------------------------
router.get('/menu', async (req, res) => {
    try {
        if (isLive()) {
            // Using Unit 2 View: vw_live_menu
            const [rows] = await getPool().query('SELECT * FROM vw_live_menu ORDER BY category_name, item_name');
            const [categories] = await getPool().query('SELECT * FROM categories ORDER BY category_id ASC');
            return res.json({ categories, items: rows });
        }

        // Demo Mock Calculation
        const itemsWithStock = mockDb.menu_items.map(item => {
            const recipe = mockDb.recipes[item.item_id] || [];
            let inStock = true;
            for (const r of recipe) {
                const ing = mockDb.ingredients.find(i => i.ingredient_id === r.ingredient_id);
                if (!ing || ing.current_stock < r.qty) {
                    inStock = false;
                    break;
                }
            }
            return {
                ...item,
                stock_status: inStock ? 'In Stock' : 'Out of Stock'
            };
        });

        res.json({ categories: mockDb.categories, items: itemsWithStock });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------
// 4. ORDER PLACEMENT (Unit 4 & 5: Atomic Transaction & Recipe Deduction)
// ------------------------------------------------------------
router.post('/orders', async (req, res) => {
    const { student_id, items, payment_method, special_instructions } = req.body;

    if (!items || !items.length) {
        return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    if (isLive()) {
        const pool = getPool();
        const connection = await pool.getConnection();
        try {
            // Demonstrate Unit 5 Atomic Transaction
            await connection.beginTransaction();

            // Calculate total
            let totalAmount = 0;
            const verifiedItems = [];

            for (const orderItem of items) {
                const [itemRows] = await connection.query('SELECT item_id, item_name, price FROM menu_items WHERE item_id = ?', [orderItem.item_id]);
                if (!itemRows.length) throw new Error(`Item ID ${orderItem.item_id} not found`);
                const item = itemRows[0];
                const subtotal = item.price * orderItem.quantity;
                totalAmount += subtotal;
                verifiedItems.push({
                    item_id: item.item_id,
                    quantity: orderItem.quantity,
                    unit_price: item.price,
                    subtotal
                });
            }

            // Insert Order Header
            const [orderRes] = await connection.query(
                'INSERT INTO orders (student_id, status, total_amount, special_instructions) VALUES (?, ?, ?, ?)',
                [student_id || 1, 'Placed', totalAmount, special_instructions || '']
            );
            const orderId = orderRes.insertId;

            // Insert Order Items (Fires trg_check_and_deduct_stock)
            for (const vItem of verifiedItems) {
                await connection.query(
                    'INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [orderId, vItem.item_id, vItem.quantity, vItem.unit_price, vItem.subtotal]
                );
            }

            // Insert Payment
            const txnRef = `TXN_${Date.now()}_${orderId}`;
            await connection.query(
                'INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref) VALUES (?, ?, ?, ?, ?)',
                [orderId, payment_method || 'UPI', 'Completed', totalAmount, txnRef]
            );

            // Unit 5: COMMIT
            await connection.commit();
            connection.release();

            return res.json({
                success: true,
                token_no: orderId,
                order_id: orderId,
                total_amount: totalAmount,
                transaction_ref: txnRef,
                message: 'Order placed successfully and inventory deducted atomically (ACID COMMIT).'
            });
        } catch (err) {
            // Unit 5: Automatic ROLLBACK on error
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                error: `Transaction Rolled Back: ${err.message}`,
                isRollback: true
            });
        }
    }

    // Resilient Demo Engine
    try {
        let totalAmount = 0;
        const verifiedItems = [];

        // 1. Check Recipe stock
        for (const it of items) {
            const menuItem = mockDb.menu_items.find(m => m.item_id === it.item_id);
            if (!menuItem) throw new Error('Menu item not found');
            const subtotal = menuItem.price * it.quantity;
            totalAmount += subtotal;

            const recipe = mockDb.recipes[it.item_id] || [];
            for (const r of recipe) {
                const ing = mockDb.ingredients.find(i => i.ingredient_id === r.ingredient_id);
                const needed = r.qty * it.quantity;
                if (!ing || ing.current_stock < needed) {
                    throw new Error(`Insufficient stock of '${ing ? ing.ingredient_name : 'ingredient'}'. Needed: ${needed} ${ing?.unit || ''}, Available: ${ing?.current_stock || 0} ${ing?.unit || ''}`);
                }
            }
            verifiedItems.push({
                item_id: menuItem.item_id,
                item_name: menuItem.item_name,
                quantity: it.quantity,
                unit_price: menuItem.price,
                subtotal
            });
        }

        // Deduct Ingredients (Simulating Trigger)
        for (const it of items) {
            const recipe = mockDb.recipes[it.item_id] || [];
            for (const r of recipe) {
                const ing = mockDb.ingredients.find(i => i.ingredient_id === r.ingredient_id);
                const needed = r.qty * it.quantity;
                ing.current_stock -= needed;
                mockDb.inventoryLogs.unshift({
                    ingredient_id: ing.ingredient_id,
                    ingredient_name: ing.ingredient_name,
                    change_type: 'DEDUCTION_ORDER',
                    quantity_changed: needed,
                    remaining_stock: ing.current_stock,
                    created_at: new Date().toISOString()
                });
            }
        }

        const student = mockDb.students.find(s => s.student_id === parseInt(student_id, 10)) || mockDb.students[0];
        const newOrderId = 100 + mockDb.orders.length + 1;
        const newOrder = {
            order_id: newOrderId,
            student_id: student.student_id,
            student_name: student.full_name,
            reg_no: student.reg_no,
            status: 'Placed',
            total_amount: totalAmount,
            special_instructions: special_instructions || '',
            order_date: new Date().toISOString(),
            items: verifiedItems
        };
        mockDb.orders.unshift(newOrder);

        res.json({
            success: true,
            token_no: newOrderId,
            order_id: newOrderId,
            total_amount: totalAmount,
            transaction_ref: `TXN_MOCK_${Date.now()}`,
            message: 'Order placed & inventory updated atomically via Trigger logic.'
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: `Transaction Rolled Back (Unit 5 Simulation): ${err.message}`,
            isRollback: true
        });
    }
});

// ------------------------------------------------------------
// 5. KITCHEN QUEUE & ORDER MANAGEMENT
// ------------------------------------------------------------
router.get('/orders/active', async (req, res) => {
    try {
        if (isLive()) {
            // Using View: vw_kitchen_queue
            const [rows] = await getPool().query('SELECT * FROM vw_kitchen_queue');
            return res.json(rows);
        }
        const active = mockDb.orders.filter(o => ['Placed', 'Preparing', 'Ready'].includes(o.status));
        res.json(active);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['Placed', 'Preparing', 'Ready', 'Picked Up', 'Cancelled'];

    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        if (isLive()) {
            await getPool().query('UPDATE orders SET status = ? WHERE order_id = ?', [status, id]);
            return res.json({ success: true, message: `Order #${id} status updated to ${status}` });
        }

        const order = mockDb.orders.find(o => o.order_id === parseInt(id, 10));
        if (order) {
            order.status = status;
            return res.json({ success: true, message: `Order #${id} status updated to ${status}` });
        }
        res.status(404).json({ error: 'Order not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------
// 6. INVENTORY & RECIPES (BOM)
// ------------------------------------------------------------
router.get('/inventory', async (req, res) => {
    try {
        if (isLive()) {
            const [ingredients] = await getPool().query('SELECT * FROM ingredients ORDER BY ingredient_name ASC');
            const [alerts] = await getPool().query('SELECT * FROM vw_low_stock_alerts');
            return res.json({ ingredients, alerts });
        }

        const alerts = mockDb.ingredients
            .filter(i => i.current_stock <= i.min_threshold)
            .map(i => ({
                ingredient_id: i.ingredient_id,
                ingredient_name: i.ingredient_name,
                unit: i.unit,
                current_stock: i.current_stock,
                min_threshold: i.min_threshold,
                deficit_amount: i.min_threshold - i.current_stock,
                urgency_level: i.current_stock <= (i.min_threshold * 0.25) ? 'CRITICAL' : 'WARNING'
            }));

        res.json({ ingredients: mockDb.ingredients, alerts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/inventory/restock', async (req, res) => {
    const { ingredient_id, quantity } = req.body;
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

    try {
        if (isLive()) {
            await getPool().query('UPDATE ingredients SET current_stock = current_stock + ? WHERE ingredient_id = ?', [qty, ingredient_id]);
            await getPool().query(
                'INSERT INTO inventory_logs (ingredient_id, change_type, quantity_changed, remaining_stock) SELECT ?, "RESTOCK_MANUAL", ?, current_stock FROM ingredients WHERE ingredient_id = ?',
                [ingredient_id, qty, ingredient_id]
            );
            return res.json({ success: true, message: `Restocked ${qty} units successfully.` });
        }

        const ing = mockDb.ingredients.find(i => i.ingredient_id === parseInt(ingredient_id, 10));
        if (ing) {
            ing.current_stock += qty;
            mockDb.inventoryLogs.unshift({
                ingredient_id: ing.ingredient_id,
                ingredient_name: ing.ingredient_name,
                change_type: 'RESTOCK_MANUAL',
                quantity_changed: qty,
                remaining_stock: ing.current_stock,
                created_at: new Date().toISOString()
            });
            return res.json({ success: true, message: `Restocked ${qty} ${ing.unit} of ${ing.ingredient_name}.` });
        }
        res.status(404).json({ error: 'Ingredient not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------
// 7. UNIT 5: INTERACTIVE ACID TRANSACTION SIMULATOR
// ------------------------------------------------------------
router.post('/demo/transaction', async (req, res) => {
    const { scenario, item_id = 1, quantity = 2 } = req.body;
    const logs = [];

    logs.push({ step: 1, action: 'START TRANSACTION;', note: 'ACID boundary established. MVCC snapshot generated.' });

    if (scenario === 'commit') {
        logs.push({ step: 2, action: `INSERT INTO orders (student_id, status, total_amount) VALUES (1, 'Placed', 120.00);`, note: 'Header record created' });
        logs.push({ step: 3, action: `INSERT INTO order_items (order_id, item_id, quantity) VALUES (LAST_INSERT_ID(), ${item_id}, ${quantity});`, note: 'Line items inserted' });
        logs.push({ step: 4, action: `TRIGGER: trg_check_and_deduct_stock fired`, note: 'BOM lookup: Dosa Batter -300g, Spiced Potato -200g, Cooking Oil -30ml. Stock verified sufficient.' });
        logs.push({ step: 5, action: `INSERT INTO payments (order_id, method, amount) VALUES (LAST_INSERT_ID(), 'UPI', 120.00);`, note: 'Payment recorded.' });
        logs.push({ step: 6, action: `COMMIT;`, note: 'Transaction succeeded! All records written to WAL redo log. Atomicity & Durability guaranteed.' });

        return res.json({
            scenario: 'COMMIT (Success)',
            success: true,
            logs,
            finalState: 'Committed to Database',
            acidProperty: 'Atomicity & Durability Verified'
        });
    }

    if (scenario === 'rollback') {
        const excessiveQty = 500;
        logs.push({ step: 2, action: `INSERT INTO orders (student_id, status, total_amount) VALUES (2, 'Placed', 30000.00);`, note: 'Initial header staged in memory' });
        logs.push({ step: 3, action: `INSERT INTO order_items (order_id, item_id, quantity) VALUES (LAST_INSERT_ID(), ${item_id}, ${excessiveQty});`, note: `Attempting to order ${excessiveQty} units` });
        logs.push({ step: 4, action: `TRIGGER: trg_check_and_deduct_stock evaluated`, note: `Stock check failed! Required 75,000g, available 8,500g. SIGNAL SQLSTATE '45000' raised!` });
        logs.push({ step: 5, action: `EXCEPTION CAUGHT: SQLEXCEPTION handler triggered`, note: 'Constraint violation detected at database engine level.' });
        logs.push({ step: 6, action: `ROLLBACK;`, note: 'All pending changes undone! Zero rows inserted into orders or order_items. Invariants preserved.' });

        return res.json({
            scenario: 'ROLLBACK (Stock Shortage Abort)',
            success: false,
            logs,
            finalState: 'Rolled Back Completely',
            acidProperty: 'Atomicity (All-or-Nothing) Verified'
        });
    }

    if (scenario === 'savepoint') {
        logs.push({ step: 2, action: `INSERT INTO orders (student_id, status) VALUES (3, 'Placed');`, note: 'Primary order staged' });
        logs.push({ step: 3, action: `INSERT INTO order_items (order_id, item_id, quantity) VALUES (LAST_INSERT_ID(), 7, 1);`, note: 'Main burger meal inserted' });
        logs.push({ step: 4, action: `SAVEPOINT sp_after_burger;`, note: 'Intermediate state marker established.' });
        logs.push({ step: 5, action: `INSERT INTO order_items (order_id, item_id, quantity) VALUES (LAST_INSERT_ID(), 10, 999);`, note: 'Add-on lassi fails stock check' });
        logs.push({ step: 6, action: `ROLLBACK TO SAVEPOINT sp_after_burger;`, note: 'Only the failed add-on undone. Main burger preserved!' });
        logs.push({ step: 7, action: `COMMIT;`, note: 'Committed partially with valid burger order.' });

        return res.json({
            scenario: 'SAVEPOINT (Partial Rollback)',
            success: true,
            logs,
            finalState: 'Partially Committed via Savepoint',
            acidProperty: 'Fine-Grained Transaction Control'
        });
    }

    res.status(400).json({ error: 'Unknown scenario' });
});

// ------------------------------------------------------------
// 8. SMART BUSINESS ANALYTICS & STATS
// ------------------------------------------------------------
router.get('/analytics', async (req, res) => {
    try {
        if (isLive()) {
            const pool = getPool();
            const [sales] = await pool.query('SELECT * FROM vw_daily_sales_summary LIMIT 1');
            const [topItems] = await pool.query(`
                SELECT m.item_name, c.category_name, SUM(oi.quantity) AS units_sold, SUM(oi.subtotal) AS revenue
                FROM order_items oi
                JOIN menu_items m ON oi.item_id = m.item_id
                JOIN categories c ON m.category_id = c.category_id
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.status <> 'Cancelled'
                GROUP BY m.item_id, m.item_name, c.category_name
                ORDER BY units_sold DESC LIMIT 5
            `);
            const [rushHour] = await pool.query(`
                SELECT HOUR(order_date) AS hour, COUNT(*) AS count 
                FROM orders 
                GROUP BY HOUR(order_date) 
                ORDER BY count DESC LIMIT 1
            `);
            const [rating] = await pool.query('SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as count FROM feedback');

            return res.json({
                summary: sales[0] || { total_orders: 0, fulfilled_revenue: 0, gross_sales: 0, average_order_value: 0 },
                topItems,
                peakHour: rushHour[0] ? `${rushHour[0].hour}:00 - ${rushHour[0].hour + 1}:00` : '12:00 - 13:00',
                rating: rating[0] || { avg_rating: 4.8, count: 2 }
            });
        }

        // Demo Mock Analytics
        const totalSales = mockDb.orders.reduce((acc, o) => acc + o.total_amount, 0);
        const itemSales = {};
        mockDb.orders.forEach(o => {
            o.items.forEach(it => {
                if (!itemSales[it.item_name]) itemSales[it.item_name] = { name: it.item_name, units: 0, revenue: 0 };
                itemSales[it.item_name].units += it.quantity;
                itemSales[it.item_name].revenue += it.subtotal;
            });
        });

        const topItems = Object.values(itemSales).sort((a, b) => b.units - a.units).slice(0, 5);

        res.json({
            summary: {
                total_orders: mockDb.orders.length,
                gross_sales: totalSales,
                average_order_value: Math.round(totalSales / (mockDb.orders.length || 1)),
                fulfilled_revenue: mockDb.orders.filter(o => o.status === 'Picked Up').reduce((acc, o) => acc + o.total_amount, 0)
            },
            topItems,
            peakHour: '12:00 - 13:00 (Lunch Rush)',
            rating: { avg_rating: 4.7, count: mockDb.feedback.length }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------
// 9. FEEDBACK SUBMISSION
// ------------------------------------------------------------
router.post('/feedback', async (req, res) => {
    const { order_id, student_id, rating, comments } = req.body;
    const rate = parseInt(rating, 10);
    if (!rate || rate < 1 || rate > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    try {
        if (isLive()) {
            await getPool().query(
                'INSERT INTO feedback (order_id, student_id, rating, comments) VALUES (?, ?, ?, ?)',
                [order_id, student_id || 1, rate, comments || '']
            );
            return res.json({ success: true, message: 'Feedback recorded.' });
        }

        mockDb.feedback.push({
            feedback_id: mockDb.feedback.length + 1,
            order_id: parseInt(order_id, 10),
            rating: rate,
            comments: comments || '',
            student_name: 'Student'
        });
        res.json({ success: true, message: 'Feedback recorded.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
