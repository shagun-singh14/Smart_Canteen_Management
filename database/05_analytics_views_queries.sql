-- ============================================================
-- CSE3001: Database Management Systems Project
-- SMART CANTEEN MANAGEMENT SYSTEM
-- File: 05_analytics_views_queries.sql (Unit 2: SQL Views & Complex Queries)
-- Target RDBMS: MySQL 8.0+
-- ============================================================

USE canteen_db;

-- ------------------------------------------------------------
-- VIEW 1: vw_live_menu
-- Live catalog for student interface showing category and real-time availability
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_live_menu AS
SELECT 
    m.item_id,
    m.item_name,
    c.category_name,
    m.description,
    m.price,
    m.preparation_time_mins,
    m.is_available,
    -- Check if any ingredient is depleted
    CASE 
        WHEN MIN(COALESCE(i.current_stock - ii.quantity_required, 0)) >= 0 THEN 'In Stock'
        ELSE 'Out of Stock'
    END AS stock_status
FROM menu_items m
JOIN categories c ON m.category_id = c.category_id
LEFT JOIN item_ingredients ii ON m.item_id = ii.item_id
LEFT JOIN ingredients i ON ii.ingredient_id = i.ingredient_id
GROUP BY m.item_id, m.item_name, c.category_name, m.description, m.price, m.preparation_time_mins, m.is_available;

-- ------------------------------------------------------------
-- VIEW 2: vw_kitchen_queue
-- Live kitchen orders currently Placed, Preparing, or Ready
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_kitchen_queue AS
SELECT 
    o.order_id,
    s.reg_no,
    s.full_name AS student_name,
    o.status,
    o.total_amount,
    o.special_instructions,
    o.order_date,
    TIMESTAMPDIFF(MINUTE, o.order_date, NOW()) AS elapsed_minutes,
    GROUP_CONCAT(CONCAT(oi.quantity, 'x ', mi.item_name) SEPARATOR ', ') AS item_summary
FROM orders o
JOIN students s ON o.student_id = s.student_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN menu_items mi ON oi.item_id = mi.item_id
WHERE o.status IN ('Placed', 'Preparing', 'Ready')
GROUP BY o.order_id, s.reg_no, s.full_name, o.status, o.total_amount, o.special_instructions, o.order_date
ORDER BY 
    CASE o.status
        WHEN 'Placed' THEN 1
        WHEN 'Preparing' THEN 2
        WHEN 'Ready' THEN 3
    END,
    o.order_date ASC;

-- ------------------------------------------------------------
-- VIEW 3: vw_low_stock_alerts
-- Inventory items at or below minimum threshold
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_low_stock_alerts AS
SELECT 
    ingredient_id,
    ingredient_name,
    unit,
    current_stock,
    min_threshold,
    ROUND(min_threshold - current_stock, 2) AS deficit_amount,
    CASE 
        WHEN current_stock <= (min_threshold * 0.25) THEN 'CRITICAL'
        WHEN current_stock <= (min_threshold * 0.50) THEN 'HIGH'
        ELSE 'WARNING'
    END AS urgency_level
FROM ingredients
WHERE current_stock <= min_threshold
ORDER BY current_stock / min_threshold ASC;

-- ------------------------------------------------------------
-- VIEW 4: vw_daily_sales_summary
-- Executive daily summary of revenues and order fulfillment
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_daily_sales_summary AS
SELECT 
    DATE(o.order_date) AS sales_date,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(CASE WHEN o.status = 'Picked Up' THEN o.total_amount ELSE 0 END) AS fulfilled_revenue,
    SUM(o.total_amount) AS gross_sales,
    ROUND(AVG(o.total_amount), 2) AS average_order_value
FROM orders o
GROUP BY DATE(o.order_date)
ORDER BY sales_date DESC;


-- ============================================================
-- COMPLEX ANALYTICAL QUERIES (CSE3001 UNIT 2 & LAB VIVA)
-- ============================================================

-- Query 1: Top 5 Most Popular Menu Items (Aggregations, GROUP BY, ORDER BY LIMIT)
SELECT 
    m.item_id,
    m.item_name,
    c.category_name,
    SUM(oi.quantity) AS total_units_sold,
    SUM(oi.subtotal) AS total_revenue_generated
FROM order_items oi
JOIN menu_items m ON oi.item_id = m.item_id
JOIN categories c ON m.category_id = c.category_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status <> 'Cancelled'
GROUP BY m.item_id, m.item_name, c.category_name
ORDER BY total_units_sold DESC
LIMIT 5;

-- Query 2: Peak Rush Hour Analysis (Date/Time Functions, GROUP BY)
SELECT 
    HOUR(order_date) AS order_hour,
    CONCAT(HOUR(order_date), ':00 - ', HOUR(order_date) + 1, ':00') AS time_window,
    COUNT(*) AS total_orders_placed,
    SUM(total_amount) AS revenue_collected,
    CASE 
        WHEN COUNT(*) >= 10 THEN 'Heavy Rush'
        WHEN COUNT(*) >= 5 THEN 'Moderate Rush'
        ELSE 'Normal'
    END AS rush_classification
FROM orders
GROUP BY HOUR(order_date), CONCAT(HOUR(order_date), ':00 - ', HOUR(order_date) + 1, ':00')
ORDER BY total_orders_placed DESC;

-- Query 3: Category-wise Revenue Breakdown with Contribution Percentage (Window Functions)
SELECT 
    c.category_name,
    COUNT(DISTINCT oi.order_id) AS order_count,
    SUM(oi.subtotal) AS category_revenue,
    ROUND(
        SUM(oi.subtotal) * 100.0 / SUM(SUM(oi.subtotal)) OVER (), 
        2
    ) AS revenue_percentage
FROM categories c
JOIN menu_items m ON c.category_id = m.category_id
JOIN order_items oi ON m.item_id = oi.item_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status <> 'Cancelled'
GROUP BY c.category_name
ORDER BY category_revenue DESC;

-- Query 4: Customer Loyalty Ranking (Window Ranking: DENSE_RANK)
SELECT 
    s.student_id,
    s.reg_no,
    s.full_name,
    COUNT(o.order_id) AS orders_placed,
    SUM(o.total_amount) AS total_spent,
    DENSE_RANK() OVER (ORDER BY SUM(o.total_amount) DESC) AS student_rank
FROM students s
JOIN orders o ON s.student_id = o.student_id
WHERE o.status <> 'Cancelled'
GROUP BY s.student_id, s.reg_no, s.full_name
ORDER BY student_rank ASC;

-- Query 5: Recipe Bill of Materials (BOM) Cost vs Margin Analysis
-- Joins ITEM_INGREDIENTS with INGREDIENTS to calculate true food preparation cost
SELECT 
    m.item_name,
    m.price AS selling_price,
    ROUND(SUM(ii.quantity_required * i.cost_per_unit), 2) AS ingredient_cost,
    ROUND(m.price - SUM(ii.quantity_required * i.cost_per_unit), 2) AS gross_profit,
    ROUND(
        ((m.price - SUM(ii.quantity_required * i.cost_per_unit)) / m.price) * 100, 
        1
    ) AS profit_margin_percent
FROM menu_items m
JOIN item_ingredients ii ON m.item_id = ii.item_id
JOIN ingredients i ON ii.ingredient_id = i.ingredient_id
GROUP BY m.item_id, m.item_name, m.price
ORDER BY gross_profit DESC;

-- Query 6: Feedback & Satisfaction Rating Summary
SELECT 
    m.item_name,
    COUNT(f.feedback_id) AS feedback_count,
    ROUND(AVG(f.rating), 1) AS average_rating,
    GROUP_CONCAT(CONCAT('"', f.comments, '"') SEPARATOR '; ') AS sample_reviews
FROM menu_items m
JOIN order_items oi ON m.item_id = oi.item_id
JOIN orders o ON oi.order_id = o.order_id
JOIN feedback f ON o.order_id = f.order_id
GROUP BY m.item_id, m.item_name
HAVING feedback_count >= 1
ORDER BY average_rating DESC;
