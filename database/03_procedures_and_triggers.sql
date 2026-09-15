-- ============================================================
-- CSE3001: Database Management Systems Project
-- SMART CANTEEN MANAGEMENT SYSTEM
-- File: 03_procedures_and_triggers.sql (Unit 4: Advanced SQL)
-- Triggers, Stored Procedures, and Functions
-- Target RDBMS: MySQL 8.0+
-- ============================================================

USE canteen_db;

DROP TRIGGER IF EXISTS trg_audit_price_change;
DROP TRIGGER IF EXISTS trg_check_and_deduct_stock;
DROP PROCEDURE IF EXISTS sp_place_order_json;
DROP PROCEDURE IF EXISTS sp_update_order_status;
DROP PROCEDURE IF EXISTS sp_restock_ingredient;
DROP FUNCTION IF EXISTS fn_calculate_bill;
DROP FUNCTION IF EXISTS fn_is_item_available;

DELIMITER //

-- ------------------------------------------------------------
-- 1. TRIGGER: trg_audit_price_change (Unit 4: Trigger Auditing)
-- Fires BEFORE UPDATE on menu_items
-- Records old price, new price, and timestamp in price_audit_log
-- ------------------------------------------------------------
CREATE TRIGGER trg_audit_price_change
BEFORE UPDATE ON menu_items
FOR EACH ROW
BEGIN
    IF OLD.price <> NEW.price THEN
        INSERT INTO price_audit_log (item_id, old_price, new_price, changed_at, changed_by)
        VALUES (OLD.item_id, OLD.price, NEW.price, NOW(), CURRENT_USER());
    END IF;
END //

-- ------------------------------------------------------------
-- 2. TRIGGER: trg_check_and_deduct_stock (Unit 4: Smart Inventory)
-- Fires AFTER INSERT on order_items
-- Automatically computes required ingredients via BOM (item_ingredients)
-- Verifies stock availability; if insufficient, aborts with SIGNAL SQLSTATE
-- If sufficient, deducts inventory and writes to audit inventory_logs
-- ------------------------------------------------------------
CREATE TRIGGER trg_check_and_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_ing_id INT;
    DECLARE v_qty_req DECIMAL(8, 2);
    DECLARE v_curr_stock DECIMAL(10, 2);
    DECLARE v_ing_name VARCHAR(100);
    DECLARE v_needed DECIMAL(10, 2);

    -- Cursor to iterate through all ingredients required for this menu item
    DECLARE cur_recipe CURSOR FOR
        SELECT ii.ingredient_id, ii.quantity_required, i.current_stock, i.ingredient_name
        FROM item_ingredients ii
        JOIN ingredients i ON ii.ingredient_id = i.ingredient_id
        WHERE ii.item_id = NEW.item_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_recipe;

    recipe_loop: LOOP
        FETCH cur_recipe INTO v_ing_id, v_qty_req, v_curr_stock, v_ing_name;
        IF done THEN
            LEAVE recipe_loop;
        END IF;

        SET v_needed = v_qty_req * NEW.quantity;

        -- Unit 5 Integration: If stock is insufficient, abort to trigger ROLLBACK
        IF v_curr_stock < v_needed THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'INSUFFICIENT_STOCK: Out of required ingredient for order';
        END IF;

        -- Deduct inventory
        UPDATE ingredients
        SET current_stock = current_stock - v_needed
        WHERE ingredient_id = v_ing_id;

        -- Log stock movement
        INSERT INTO inventory_logs (ingredient_id, change_type, quantity_changed, remaining_stock, reference_order_id)
        VALUES (v_ing_id, 'DEDUCTION_ORDER', v_needed, v_curr_stock - v_needed, NEW.order_id);

    END LOOP;

    CLOSE cur_recipe;
END //

-- ------------------------------------------------------------
-- 3. STORED FUNCTION: fn_calculate_bill (Unit 4: Functions)
-- Calculates grand total with 5% campus facility charge/tax
-- ------------------------------------------------------------
CREATE FUNCTION fn_calculate_bill(p_subtotal DECIMAL(10, 2), p_tax_rate DECIMAL(5, 2))
RETURNS DECIMAL(10, 2)
DETERMINISTIC
BEGIN
    DECLARE v_total DECIMAL(10, 2);
    SET v_total = p_subtotal + (p_subtotal * (p_tax_rate / 100.00));
    RETURN ROUND(v_total, 2);
END //

-- ------------------------------------------------------------
-- 4. STORED FUNCTION: fn_is_item_available (Unit 4: Functions)
-- Checks if all ingredients for a menu item are above requirements
-- Returns 1 (Available) or 0 (Out of stock)
-- ------------------------------------------------------------
CREATE FUNCTION fn_is_item_available(p_item_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_shortage_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_shortage_count
    FROM item_ingredients ii
    JOIN ingredients i ON ii.ingredient_id = i.ingredient_id
    WHERE ii.item_id = p_item_id
      AND i.current_stock < ii.quantity_required;

    IF v_shortage_count > 0 THEN
        RETURN 0;
    ELSE
        RETURN 1;
    END IF;
END //

-- ------------------------------------------------------------
-- 5. STORED PROCEDURE: sp_place_order_json (Unit 4 & Unit 5)
-- Atomically places an order with JSON payload:
-- e.g. [{"item_id": 1, "qty": 2}, {"item_id": 8, "qty": 1}]
-- Demonstrates START TRANSACTION, COMMIT, and ROLLBACK on error
-- ------------------------------------------------------------
CREATE PROCEDURE sp_place_order_json(
    IN p_student_id INT,
    IN p_payment_method VARCHAR(20),
    IN p_special_instructions VARCHAR(255),
    IN p_items_json JSON,
    OUT p_out_order_id INT,
    OUT p_status_code VARCHAR(20),
    OUT p_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_new_order_id INT;
    DECLARE v_calc_total DECIMAL(10, 2) DEFAULT 0.00;
    DECLARE v_json_len INT;
    DECLARE i INT DEFAULT 0;
    DECLARE v_item_id INT;
    DECLARE v_qty INT;
    DECLARE v_price DECIMAL(8, 2);
    DECLARE v_subtotal DECIMAL(10, 2);
    DECLARE v_txn_ref VARCHAR(64);

    -- Error handler to guarantee atomicity (Unit 5: ROLLBACK on error)
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_out_order_id = NULL;
        SET p_status_code = 'ROLLBACK';
        SET p_message = 'Transaction aborted: Insufficient stock or invalid constraints. All changes rolled back.';
    END;

    START TRANSACTION;

    -- Validate items count
    SET v_json_len = JSON_LENGTH(p_items_json);
    IF v_json_len IS NULL OR v_json_len = 0 THEN
        SET p_status_code = 'ERROR';
        SET p_message = 'Order cannot be empty.';
        ROLLBACK;
        LEAVE proc_label;
    END IF;

    -- Insert order header initially with 0 total
    INSERT INTO orders (student_id, status, total_amount, special_instructions)
    VALUES (p_student_id, 'Placed', 0.00, p_special_instructions);

    SET v_new_order_id = LAST_INSERT_ID();

    -- Iterate JSON array using JSON_EXTRACT
    WHILE i < v_json_len DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].item_id')));
        SET v_qty = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].qty')));

        -- Retrieve current price
        SELECT price INTO v_price FROM menu_items WHERE item_id = v_item_id;
        IF v_price IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid item_id in order';
        END IF;

        SET v_subtotal = v_price * v_qty;
        SET v_calc_total = v_calc_total + v_subtotal;

        -- Insert into order_items (This triggers trg_check_and_deduct_stock)
        INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
        VALUES (v_new_order_id, v_item_id, v_qty, v_price, v_subtotal);

        SET i = i + 1;
    END WHILE;

    -- Update order header with verified total
    UPDATE orders SET total_amount = v_calc_total WHERE order_id = v_new_order_id;

    -- Generate payment record
    SET v_txn_ref = CONCAT('TXN_', UNIX_TIMESTAMP(), '_', v_new_order_id);
    INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref)
    VALUES (v_new_order_id, p_payment_method, 'Completed', v_calc_total, v_txn_ref);

    -- Commit transaction (Unit 5: ACID Durability)
    COMMIT;

    SET p_out_order_id = v_new_order_id;
    SET p_status_code = 'SUCCESS';
    SET p_message = 'Order placed successfully and inventory updated atomically.';
END //

-- ------------------------------------------------------------
-- 6. STORED PROCEDURE: sp_update_order_status
-- Order lifecycle management (Placed -> Preparing -> Ready -> Picked Up)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_update_order_status(
    IN p_order_id INT,
    IN p_new_status VARCHAR(20),
    OUT p_result VARCHAR(50)
)
BEGIN
    UPDATE orders
    SET status = p_new_status
    WHERE order_id = p_order_id;

    IF ROW_COUNT() > 0 THEN
        SET p_result = CONCAT('Order #', p_order_id, ' status updated to ', p_new_status);
    ELSE
        SET p_result = 'Order not found';
    END IF;
END //

-- ------------------------------------------------------------
-- 7. STORED PROCEDURE: sp_restock_ingredient
-- Manual restocking of raw canteen ingredients
-- ------------------------------------------------------------
CREATE PROCEDURE sp_restock_ingredient(
    IN p_ingredient_id INT,
    IN p_quantity DECIMAL(10, 2),
    OUT p_new_stock DECIMAL(10, 2)
)
BEGIN
    UPDATE ingredients
    SET current_stock = current_stock + p_quantity
    WHERE ingredient_id = p_ingredient_id;

    SELECT current_stock INTO p_new_stock
    FROM ingredients
    WHERE ingredient_id = p_ingredient_id;

    -- Log manual restock
    INSERT INTO inventory_logs (ingredient_id, change_type, quantity_changed, remaining_stock)
    VALUES (p_ingredient_id, 'RESTOCK_MANUAL', p_quantity, p_new_stock);
END //

DELIMITER ;
