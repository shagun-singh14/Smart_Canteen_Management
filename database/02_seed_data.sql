-- ============================================================
-- CSE3001: Database Management Systems Project
-- SMART CANTEEN MANAGEMENT SYSTEM
-- File: 02_seed_data.sql (Unit 2: DML Seed Data)
-- Target RDBMS: MySQL 8.0+
-- ============================================================

USE canteen_db;

-- ------------------------------------------------------------
-- 1. SEED STUDENTS
-- ------------------------------------------------------------
INSERT INTO students (reg_no, full_name, email, phone, wallet_balance) VALUES
('23BCE1001', 'Aarav Sharma', 'aarav.sharma@vitstudent.ac.in', '9876543210', 450.00),
('23BCE1045', 'Ananya Iyer', 'ananya.iyer@vitstudent.ac.in', '9876543211', 820.00),
('23BCE1120', 'Rohan Verma', 'rohan.verma@vitstudent.ac.in', '9876543212', 310.00),
('23BCE1289', 'Sneha Patel', 'sneha.patel@vitstudent.ac.in', '9876543213', 950.00),
('23BCE1344', 'Vikramaditya Rao', 'vikram.rao@vitstudent.ac.in', '9876543214', 150.00);

-- ------------------------------------------------------------
-- 2. SEED CATEGORIES
-- ------------------------------------------------------------
INSERT INTO categories (category_name, description) VALUES
('South Indian', 'Authentic dosas, idlis, vadas with sambar and fresh chutney'),
('North Indian', 'Rich curries, biryanis, and bread rolls'),
('Snacks & Fast Food', 'Quick bites, samosas, burgers, and sandwiches'),
('Beverages', 'Hot teas, filter coffee, coolers, and shakes');

-- ------------------------------------------------------------
-- 3. SEED MENU ITEMS
-- ------------------------------------------------------------
INSERT INTO menu_items (category_id, item_name, description, price, preparation_time_mins, is_available, image_url) VALUES
(1, 'Masala Dosa', 'Crispy golden crepe filled with spiced mashed potatoes, served with coconut chutney & sambar', 60.00, 8, TRUE, 'masala_dosa.jpg'),
(1, 'Plain Dosa', 'Crispy classic fermented rice-lentil crepe served with sambar and chutneys', 45.00, 6, TRUE, 'plain_dosa.jpg'),
(1, 'Idli Sambar (2 pcs)', 'Steamed fluffy rice-lentil cakes served submerged in aromatic lentil sambar', 40.00, 5, TRUE, 'idli_sambar.jpg'),
(2, 'Veg Biryani', 'Fragrant basmati rice dum-cooked with fresh garden veggies and aromatic spices', 110.00, 12, TRUE, 'veg_biryani.jpg'),
(2, 'Paneer Butter Masala', 'Soft cottage cheese cubes in rich and buttery tomato-cashew gravy with roti', 130.00, 15, TRUE, 'paneer_butter_masala.jpg'),
(3, 'Crispy Samosa (2 pcs)', 'Flaky pastry stuffed with spiced potatoes and green peas, served with mint chutney', 30.00, 4, TRUE, 'samosa.jpg'),
(3, 'Veggie Burger', 'Crisp herb patty topped with lettuce, sliced tomatoes, and creamy dressing in sesame bun', 70.00, 10, TRUE, 'veg_burger.jpg'),
(4, 'South Indian Filter Coffee', 'Traditional strong decoction brewed with fresh frothed milk and chicory', 25.00, 3, TRUE, 'filter_coffee.jpg'),
(4, 'Masala Chai', 'Aromatic Indian spiced tea simmered with fresh ginger, cardamom, and whole milk', 20.00, 3, TRUE, 'masala_chai.jpg'),
(4, 'Mango Lassi', 'Chilled sweet yogurt smoothie blended with ripe Alphonso mango puree', 50.00, 4, TRUE, 'mango_lassi.jpg');

-- ------------------------------------------------------------
-- 4. SEED INGREDIENTS (Inventory)
-- ------------------------------------------------------------
INSERT INTO ingredients (ingredient_name, unit, current_stock, min_threshold, cost_per_unit) VALUES
('Dosa Batter', 'grams', 8500.00, 2000.00, 0.05),
('Spiced Potato Filling', 'grams', 3200.00, 1500.00, 0.08),
('Cooking Oil', 'ml', 4500.00, 1000.00, 0.15),
('Aromatic Sambar Gravy', 'ml', 6000.00, 2000.00, 0.06),
('Basmati Rice', 'grams', 9000.00, 2500.00, 0.09),
('Paneer (Cottage Cheese)', 'grams', 2500.00, 1000.00, 0.40),
('Burger Buns', 'pieces', 45.00, 15.00, 6.00),
('Veg Patty', 'pieces', 38.00, 15.00, 14.00),
('Fresh Cow Milk', 'ml', 9500.00, 3000.00, 0.06),
('Coffee Decoction/Powder', 'grams', 1200.00, 300.00, 0.60),
('Assam Tea Leaves', 'grams', 800.00, 250.00, 0.45),
('Granulated Sugar', 'grams', 4000.00, 1000.00, 0.04),
('Fresh Yogurt/Curd', 'ml', 3500.00, 1000.00, 0.07);

-- ------------------------------------------------------------
-- 5. SEED ITEM_INGREDIENTS (Recipe / Bill of Materials - BOM)
-- Shows decomposition of recipe into constituent raw ingredients
-- ------------------------------------------------------------
-- Masala Dosa (item_id 1)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(1, 1, 150.00), -- 150g Dosa Batter
(1, 2, 100.00), -- 100g Spiced Potato Filling
(1, 3, 15.00);  -- 15ml Cooking Oil

-- Plain Dosa (item_id 2)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(2, 1, 150.00), -- 150g Dosa Batter
(2, 3, 10.00);  -- 10ml Cooking Oil

-- Idli Sambar (item_id 3)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(3, 1, 180.00), -- 180g Batter
(3, 4, 150.00); -- 150ml Sambar Gravy

-- Veg Biryani (item_id 4)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(4, 5, 200.00), -- 200g Basmati Rice
(4, 3, 20.00),  -- 20ml Cooking Oil
(4, 4, 80.00);  -- 80ml Gravy/Spices

-- Paneer Butter Masala (item_id 5)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(5, 6, 150.00), -- 150g Paneer
(5, 3, 25.00),  -- 25ml Cooking Oil
(5, 4, 120.00); -- 120ml Gravy

-- Crispy Samosa (item_id 6)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(6, 2, 120.00), -- 120g Potato Filling
(6, 3, 30.00);  -- 30ml Frying Oil

-- Veggie Burger (item_id 7)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(7, 7, 1.00),   -- 1 Burger Bun
(7, 8, 1.00),   -- 1 Veg Patty
(7, 3, 10.00);  -- 10ml Toasting Oil

-- South Indian Filter Coffee (item_id 8)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(8, 9, 150.00),  -- 150ml Milk
(8, 10, 15.00),  -- 15g Coffee Powder
(8, 12, 15.00);  -- 15g Sugar

-- Masala Chai (item_id 9)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(9, 9, 120.00),  -- 120ml Milk
(9, 11, 10.00),  -- 10g Tea Leaves
(9, 12, 15.00);  -- 15g Sugar

-- Mango Lassi (item_id 10)
INSERT INTO item_ingredients (item_id, ingredient_id, quantity_required) VALUES
(10, 13, 200.00), -- 200ml Curd
(10, 12, 25.00);  -- 25g Sugar

-- ------------------------------------------------------------
-- 6. SEED ORDERS, ITEMS, PAYMENTS & FEEDBACK
-- ------------------------------------------------------------
-- Order #1: Placed earlier today (Picked Up)
INSERT INTO orders (student_id, order_date, status, total_amount, special_instructions) VALUES
(1, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'Picked Up', 120.00, 'Make the dosa extra crisp');

INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal) VALUES
(1, 1, 2, 60.00, 120.00);

INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref, payment_time) VALUES
(1, 'UPI', 'Completed', 120.00, 'TXN_UPI_982341234', DATE_SUB(NOW(), INTERVAL 3 HOUR));

INSERT INTO feedback (order_id, student_id, rating, comments) VALUES
(1, 1, 5, 'Best crispy Masala Dosa on campus! Chutney was fresh.');

-- Order #2: Placed 1 hour ago (Ready for pickup)
INSERT INTO orders (student_id, order_date, status, total_amount, special_instructions) VALUES
(2, DATE_SUB(NOW(), INTERVAL 50 MINUTE), 'Ready', 135.00, 'Less spicy biryani please');

INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal) VALUES
(2, 4, 1, 110.00, 110.00),
(2, 8, 1, 25.00, 25.00);

INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref, payment_time) VALUES
(2, 'Student Wallet', 'Completed', 135.00, 'TXN_WAL_887123912', DATE_SUB(NOW(), INTERVAL 50 MINUTE));

-- Order #3: Currently in Kitchen (Preparing)
INSERT INTO orders (student_id, order_date, status, total_amount, special_instructions) VALUES
(3, DATE_SUB(NOW(), INTERVAL 15 MINUTE), 'Preparing', 90.00, 'Fast please, class at 2:30');

INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal) VALUES
(3, 6, 2, 30.00, 60.00),
(3, 6, 1, 30.00, 30.00);

INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref, payment_time) VALUES
(3, 'Card', 'Completed', 90.00, 'TXN_CRD_102938475', DATE_SUB(NOW(), INTERVAL 15 MINUTE));

-- Order #4: Just Placed (Placed)
INSERT INTO orders (student_id, order_date, status, total_amount, special_instructions) VALUES
(4, DATE_SUB(NOW(), INTERVAL 2 MINUTE), 'Placed', 150.00, 'No onions');

INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal) VALUES
(4, 5, 1, 130.00, 130.00),
(4, 9, 1, 20.00, 20.00);

INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_ref, payment_time) VALUES
(4, 'UPI', 'Completed', 150.00, 'TXN_UPI_771238910', DATE_SUB(NOW(), INTERVAL 2 MINUTE));

-- ------------------------------------------------------------
-- 7. SEED KITCHEN STAFF (Staff Authentication)
-- ------------------------------------------------------------
INSERT INTO kitchen_staff (full_name, email, role, is_active) VALUES
('Chef Ramesh Kumar', 'chef.ramesh@canteen.vit.ac.in', 'Head Chef', TRUE),
('Suresh Canteen Manager', 'manager@canteen.vit.ac.in', 'Canteen Manager', TRUE),
('Priya Cook', 'cook.priya@canteen.vit.ac.in', 'Cook', TRUE);

