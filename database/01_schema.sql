-- ============================================================
-- CSE3001: Database Management Systems Project
-- SMART CANTEEN MANAGEMENT SYSTEM
-- File: 01_schema.sql (Unit 1 & Unit 2: DDL & Constraints)
-- Target RDBMS: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS canteen_db;
USE canteen_db;

-- ------------------------------------------------------------
-- Drop existing tables in reverse dependency order
-- ------------------------------------------------------------
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS item_ingredients;
DROP TABLE IF EXISTS inventory_logs;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS price_audit_log;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS kitchen_staff;
DROP TABLE IF EXISTS students;

-- ------------------------------------------------------------
-- 1. STUDENTS TABLE
-- Integrity Constraints: Primary Key, Unique Constraints
-- ------------------------------------------------------------
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    reg_no VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wallet_positive CHECK (wallet_balance >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ------------------------------------------------------------
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. MENU_ITEMS TABLE
-- Integrity Constraints: Foreign Key, Check Price > 0
-- ------------------------------------------------------------
CREATE TABLE menu_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(8, 2) NOT NULL,
    preparation_time_mins INT DEFAULT 10,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_category FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) ON DELETE CASCADE,
    CONSTRAINT chk_item_price CHECK (price > 0),
    CONSTRAINT chk_prep_time CHECK (preparation_time_mins >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. INGREDIENTS TABLE (Inventory)
-- Integrity Constraints: Check Current Stock >= 0
-- ------------------------------------------------------------
CREATE TABLE ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL, -- e.g., 'grams', 'ml', 'pieces'
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    min_threshold DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    cost_per_unit DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    last_restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_non_negative CHECK (current_stock >= 0),
    CONSTRAINT chk_threshold_positive CHECK (min_threshold >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. ITEM_INGREDIENTS TABLE (Recipe / Bill of Materials - BOM)
-- Resolves Many-to-Many between MENU_ITEMS and INGREDIENTS
-- Composite Primary Key: (item_id, ingredient_id)
-- ------------------------------------------------------------
CREATE TABLE item_ingredients (
    item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_required DECIMAL(8, 2) NOT NULL,
    PRIMARY KEY (item_id, ingredient_id),
    CONSTRAINT fk_recipe_item FOREIGN KEY (item_id) 
        REFERENCES menu_items(item_id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_ingredient FOREIGN KEY (ingredient_id) 
        REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
    CONSTRAINT chk_qty_req CHECK (quantity_required > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. ORDERS TABLE
-- Order status domain constraint
-- ------------------------------------------------------------
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Placed', 'Preparing', 'Ready', 'Picked Up', 'Cancelled') NOT NULL DEFAULT 'Placed',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    special_instructions VARCHAR(255),
    CONSTRAINT fk_orders_student FOREIGN KEY (student_id) 
        REFERENCES students(student_id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_total CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. ORDER_ITEMS TABLE
-- Weak entity dependent on ORDERS
-- ------------------------------------------------------------
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(8, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_orderitems_item FOREIGN KEY (item_id) 
        REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_qty CHECK (quantity > 0),
    CONSTRAINT chk_subtotal CHECK (subtotal >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. PAYMENTS TABLE
-- 1-to-1 Relationship with ORDERS
-- ------------------------------------------------------------
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    payment_method ENUM('UPI', 'Card', 'Cash', 'Student Wallet') NOT NULL DEFAULT 'UPI',
    payment_status ENUM('Pending', 'Completed', 'Failed', 'Refunded') NOT NULL DEFAULT 'Completed',
    amount DECIMAL(10, 2) NOT NULL,
    transaction_ref VARCHAR(64) NOT NULL UNIQUE,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. FEEDBACK TABLE
-- Rating check constraint (1 to 5)
-- ------------------------------------------------------------
CREATE TABLE feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    student_id INT NOT NULL,
    rating INT NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_student FOREIGN KEY (student_id) 
        REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. INVENTORY_LOGS TABLE (Audit trail for stock updates)
-- ------------------------------------------------------------
CREATE TABLE inventory_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    change_type ENUM('DEDUCTION_ORDER', 'RESTOCK_MANUAL', 'ADJUSTMENT') NOT NULL,
    quantity_changed DECIMAL(10, 2) NOT NULL,
    remaining_stock DECIMAL(10, 2) NOT NULL,
    reference_order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invlog_ingredient FOREIGN KEY (ingredient_id) 
        REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. PRICE_AUDIT_LOG TABLE (Demonstrating Unit 4 Trigger Auditing)
-- ------------------------------------------------------------
CREATE TABLE price_audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    old_price DECIMAL(8, 2) NOT NULL,
    new_price DECIMAL(8, 2) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(50) DEFAULT 'ADMIN'
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 12. KITCHEN_STAFF TABLE (Staff & Chef Authentication)
-- ------------------------------------------------------------
CREATE TABLE kitchen_staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('Head Chef', 'Cook', 'Canteen Manager') NOT NULL DEFAULT 'Cook',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- INDEXES FOR QUERY OPTIMIZATION (Unit 4: Indexing)
-- ------------------------------------------------------------
CREATE INDEX idx_orders_date_status ON orders(order_date, status);
CREATE INDEX idx_orders_student ON orders(student_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);
CREATE INDEX idx_ingredients_stock ON ingredients(current_stock, min_threshold);
CREATE INDEX idx_menu_category ON menu_items(category_id, is_available);
