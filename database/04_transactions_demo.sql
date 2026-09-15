-- ============================================================
-- CSE3001: Database Management Systems Project
-- SMART CANTEEN MANAGEMENT SYSTEM
-- File: 04_transactions_demo.sql (Unit 5: Transactions & Concurrency)
-- Demonstration of ACID Properties, COMMIT, ROLLBACK & SAVEPOINTS
-- Target RDBMS: MySQL 8.0+
-- ============================================================

USE canteen_db;

-- ============================================================
-- SCENARIO 1: ATOMIC ORDER PLACEMENT (SUCCESSFUL TRANSACTION -> COMMIT)
-- Atomicity: All operations (Order + Order Items + Payment + Stock Deduction)
-- succeed together and are permanently recorded.
-- ============================================================

-- Step 0: Check initial inventory before transaction
SELECT ingredient_name, current_stock, unit 
FROM ingredients 
WHERE ingredient_id IN (1, 3); -- Batter & Oil

-- Step 1: Begin Atomic Transaction
START TRANSACTION;

-- Step 2: Insert Order
INSERT INTO orders (student_id, status, total_amount, special_instructions)
VALUES (1, 'Placed', 90.00, 'Make both plain dosas crispy');

SET @demo_order_id = LAST_INSERT_ID();

-- Step 3: Insert Order Items (Fires trg_check_and_deduct_stock automatically)
INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
VALUES (@demo_order_id, 2, 2, 45.00, 90.00); -- 2 x Plain Dosa

-- Step 4: Record Payment
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref)
VALUES (@demo_order_id, 'UPI', 'Completed', 90.00, CONCAT('TXN_DEMO_', @demo_order_id));

-- Step 5: Commit changes (ACID: Durability guaranteed)
COMMIT;

-- Verify after COMMIT:
SELECT * FROM orders WHERE order_id = @demo_order_id;
SELECT * FROM order_items WHERE order_id = @demo_order_id;
SELECT * FROM payments WHERE order_id = @demo_order_id;
-- Note that ingredients have been deducted!
SELECT ingredient_name, current_stock, unit 
FROM ingredients 
WHERE ingredient_id IN (1, 3);


-- ============================================================
-- SCENARIO 2: STOCK EXHAUSTION FAILURE (UNSUCCESSFUL -> ROLLBACK)
-- Demonstrates Atomicity: If any step fails (insufficient stock),
-- the entire transaction is rolled back. No orphan orders remain.
-- ============================================================

START TRANSACTION;

-- Attempt to insert an order
INSERT INTO orders (student_id, status, total_amount, special_instructions)
VALUES (2, 'Placed', 35000.00, 'Catering bulk order');

SET @fail_order_id = LAST_INSERT_ID();

-- Check stock of Burger Buns before attempt
SELECT ingredient_name, current_stock FROM ingredients WHERE ingredient_id = 7;

-- This item requires 500 burger buns (current stock is ~45).
-- In a procedural block or trigger, SIGNAL SQLSTATE '45000' will occur.
-- Here we simulate the application catching the error and rolling back:

-- If an error is caught:
ROLLBACK;

-- Verify Atomicity:
-- The order record was NOT saved!
SELECT * FROM orders WHERE order_id = @fail_order_id;


-- ============================================================
-- SCENARIO 3: PARTIAL ROLLBACK USING SAVEPOINT
-- Demonstrates fine-grained transaction control
-- ============================================================

START TRANSACTION;

-- 1. Order primary meal: Veggie Burger
INSERT INTO orders (student_id, status, total_amount, special_instructions)
VALUES (3, 'Placed', 70.00, 'Student combo');

SET @combo_order_id = LAST_INSERT_ID();

INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
VALUES (@combo_order_id, 7, 1, 70.00, 70.00);

-- Establish Savepoint after primary item
SAVEPOINT sp_after_burger;

-- 2. Attempt add-on: Hypothetical invalid item or simulated cancellation
-- Rolling back only the add-on while keeping the main burger:
ROLLBACK TO SAVEPOINT sp_after_burger;

-- Record payment for the accepted items
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref)
VALUES (@combo_order_id, 'Card', 'Completed', 70.00, CONCAT('TXN_SAVEPOINT_', @combo_order_id));

COMMIT;

-- Verify order committed with burger only
SELECT * FROM order_items WHERE order_id = @combo_order_id;


-- ============================================================
-- SCENARIO 4: DEMONSTRATING STORED PROCEDURE TRANSACTION CALL
-- ============================================================
-- Successful order via procedure
CALL sp_place_order_json(
    1, 
    'UPI', 
    'Extra chutney please', 
    '[{"item_id": 8, "qty": 2}]', -- 2 Filter Coffees
    @new_id, 
    @status, 
    @msg
);

SELECT @new_id AS order_id, @status AS transaction_status, @msg AS transaction_log;

-- Failed order via procedure (Huge quantity exceeding milk/coffee stock)
CALL sp_place_order_json(
    1, 
    'UPI', 
    'Bulk order', 
    '[{"item_id": 8, "qty": 5000}]', -- Exceeds 9500ml milk by far
    @fail_id, 
    @fail_status, 
    @fail_msg
);

SELECT @fail_id AS order_id, @fail_status AS transaction_status, @fail_msg AS transaction_log;
