# Smart Canteen Management System
## DBMS Project Report & MySQL Workbench Guide

---

## Part 1: DBMS Concepts Implemented & Where They Are Used

This project is built directly on a production-grade relational database (**MySQL 8.0 with the InnoDB storage engine**). Below is an easy-to-understand explanation of every core Database Management System (DBMS) concept implemented in this project and the exact files and tables where they work.

```
+-----------------------------------------------------------------------------------+
|                           SMART CANTEEN SYSTEM ARCHITECTURE                       |
+-----------------------------------------------------------------------------------+
|  [Student Portal]         [Kitchen Display (KDS)]          [Inventory / Stock]    |
|   - Browse Menu            - Token Number Kanban            - Bill of Materials   |
|   - Place Order            - Status: Placed->Prep->Ready    - Auto Stock Deduct   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ (REST API / Node.js)
+-----------------------------------------------------------------------------------+
|                                MYSQL 8.0 DATABASE                                 |
|  1. Relational Schema & 3NF Normalization (12 interrelated tables)                |
|  2. ACID Transactions (START TRANSACTION, COMMIT, ROLLBACK)                        |
|  3. Automated Triggers (Stock deduction on order insert, price audit trail)       |
|  4. Stored Procedures & Functions (sp_place_order, fn_calculate_bill)             |
|  5. Referential Integrity & Domain Constraints (CHECK, FK CASCADE/RESTRICT)      |
|  6. Views & Aggregations (Live KDS Queue, Daily Gross Sales, Peak Rush Hours)     |
|  7. B-Tree Indexes (Fast sub-millisecond query search on orders & inventory)      |
+-----------------------------------------------------------------------------------+
```

---

### 1. Relational Schema & Database Normalization (1NF, 2NF, 3NF, BCNF)
- **Concept in Simple Words**: Instead of storing everything in one giant Excel sheet where data gets repeated and messy, we divide the data into organized tables that connect to each other using IDs.
- **Where It Is Used**:
  - `students`: Stores student information only (ID, registration number, name, email, wallet balance).
  - `categories`: Stores food categories (`South Indian`, `North Indian`, `Beverages`).
  - `menu_items`: Stores food dishes and prices.
  - `ingredients`: Stores raw kitchen supplies (`Rice`, `Coffee Beans`, `Milk`).
  - `item_ingredients` (Bridging Table / Bill of Materials): Resolves the **Many-to-Many (M:N)** relationship between dishes and raw materials. For example, 1 Masala Dosa requires 150g Rice Batter, 30g Potato, and 20g Ghee.
  - `orders` & `order_items`: A student can order 3 different dishes in one order. Normalizing into an order header (`orders`) and order lines (`order_items`) eliminates repeating groups (1NF) and transitive dependencies (3NF).

---

### 2. Primary Keys, Foreign Keys & Referential Integrity
- **Concept in Simple Words**: 
  - **Primary Key (PK)**: A unique barcode or ID for every single record so it can never be mixed up with another.
  - **Foreign Key (FK)**: A link connecting a record in one table to a valid record in another table.
- **Where It Is Used**:
  - `students.student_id` (PK) links to `orders.student_id` (FK). A student who doesn't exist cannot place an order.
  - `menu_items.category_id` (FK) links to `categories.category_id` (PK) with `ON DELETE CASCADE`: If a category is deleted, all items under it are safely handled.
  - `item_ingredients.ingredient_id` (FK) links to `ingredients.ingredient_id` with `ON DELETE RESTRICT`: The canteen cannot accidentally delete "Milk" from the inventory if existing recipes still depend on it!

---

### 3. Constraints & Domain Integrity (CHECK, UNIQUE, NOT NULL, ENUM)
- **Concept in Simple Words**: Strict validation rules set at the database engine level so wrong, negative, or corrupt data is rejected before it can ever be saved.
- **Where It Is Used**:
  - **`CHECK (wallet_balance >= 0)`**: Prevents students from having negative wallet balances.
  - **`CHECK (price > 0)`**: Prevents canteen food from having a ₹0 or negative price.
  - **`CHECK (rating BETWEEN 1 AND 5)`**: In the `feedback` table, ensures ratings are strictly between 1 and 5 stars.
  - **`UNIQUE (email)` & `UNIQUE (reg_no)`**: Ensures no two students or staff members can register with duplicate email IDs or registration numbers.
  - **`ENUM`**: Restricts status columns to valid state values only:
    - `orders.status`: `'Placed'`, `'Preparing'`, `'Ready'`, `'Picked Up'`, `'Cancelled'`
    - `payments.payment_method`: `'Student Wallet'`, `'UPI'`, `'Card'`, `'Cash'`
    - `kitchen_staff.role`: `'Head Chef'`, `'Cook'`, `'Canteen Manager'`

---

### 4. ACID Transactions (Atomicity, Consistency, Isolation, Durability)
- **Concept in Simple Words**: When a student buys food, multiple things must happen:
  1. Deduct ₹150 from the student's wallet.
  2. Create the order record in `orders`.
  3. Create dish entries in `order_items`.
  4. Deduct the raw recipe ingredients from `ingredients`.
  5. Issue the official **Token Number**.
  If the student's wallet has only ₹50 or the kitchen runs out of rice halfway through, **Atomicity** ensures the whole transaction is **ROLLED BACK** completely. Money is never lost and orders are never half-created!
- **Where It Is Used**:
  - Located in `server/index.js` (under the `/api/orders` checkout endpoint) and demonstrated in `database/04_transactions_demo.sql`.
  - Uses `START TRANSACTION`, `COMMIT`, and `ROLLBACK` with MySQL's `InnoDB` engine.

---

### 5. Database Triggers (Active Database)
- **Concept in Simple Words**: Automated programs stored inside MySQL that run automatically whenever someone Inserts, Updates, or Deletes data in a table.
- **Where It Is Used** (in `database/03_procedures_and_triggers.sql`):
  1. **`trg_check_and_deduct_stock`** (`AFTER INSERT ON order_items`):
     - Every time an item is added to an order, this trigger automatically reads the recipe in `item_ingredients`, checks if enough ingredients exist in `ingredients`, deducts the stock, and records the change in `inventory_logs`.
     - If raw materials are exhausted, it raises `SIGNAL SQLSTATE '45000'` which immediately cancels the order and refunds the student!
  2. **`trg_audit_price_change`** (`BEFORE UPDATE ON menu_items`):
     - Every time a canteen manager updates the price of any food item, this trigger logs the old price, new price, username, and exact timestamp into the `price_audit_log` table for financial transparency.

---

### 6. Stored Procedures & User-Defined Functions
- **Concept in Simple Words**: Pre-compiled SQL programs stored on the database server for high performance, reusability, and business logic security.
- **Where It Is Used** (in `database/03_procedures_and_triggers.sql`):
  - **`sp_update_order_status(p_order_id, p_new_status)`**: Advances an order from Placed -> Preparing -> Ready -> Picked Up.
  - **`sp_restock_ingredient(p_ingredient_id, p_quantity)`**: Adds fresh raw material stock and writes an entry to `inventory_logs`.
  - **`fn_calculate_bill(p_subtotal, p_tax_rate)`**: Computes final totals with applicable tax or campus facility charges.

---

### 7. Views & Analytics Aggregations (JOINs, GROUP BY, SUM, AVG)
- **Concept in Simple Words**: Virtual tables that combine data from multiple tables using JOINs and summarize numbers with functions like SUM, AVG, and COUNT.
- **Where It Is Used** (in `database/05_analytics_views_queries.sql`):
  - **`v_active_kds_queue`**: Merges `orders`, `students`, and `order_items` so the kitchen chef sees Token Numbers, student names, and food summaries without complex multi-table queries.
  - **`v_daily_sales_summary`**: Calculates today's gross sales revenue, total token count, and average order value.
  - **`v_inventory_stock_status`**: Compares `current_stock` against `min_threshold` and marks items as `'OK'`, `'LOW STOCK'`, or `'CRITICAL DEFICIT'`.
  - **Peak Rush Hour Calculation**: Uses `GROUP BY HOUR(order_date)` and `COUNT(*)` to identify when the canteen has maximum footfall.

---

### 8. Database Indexing (Performance Optimization)
- **Concept in Simple Words**: Like the index at the back of a textbook, B-Tree indexes allow MySQL to locate specific student emails or active orders in microseconds without scanning millions of rows.
- **Where It Is Used** (in `database/01_schema.sql`):
  - `idx_orders_date_status ON orders(order_date, status)`: Makes the kitchen queue load instantly.
  - `idx_orders_student ON orders(student_id)`: Speeds up student token tracking.
  - `idx_ingredients_stock ON ingredients(current_stock, min_threshold)`: Instant stock alert lookups.

---
---

## Part 2: How to Edit, Add, and Remove Data in MySQL Workbench

You can manage your canteen database in MySQL Workbench using two simple methods:
1. **The Visual Spreadsheet Editor (Recommended - No coding needed!)**
2. **Simple 1-Line SQL Commands**

---

### Method 1: The Visual Grid Editor (Like Microsoft Excel)

This is the easiest way to add, edit, or delete any record visually:

1. Open **MySQL Workbench** and double-click your connection (**Local instance 3306**).
2. Look at the **left sidebar** under the **Navigator** panel.
3. Click the **Schemas** tab.
4. Expand **`canteen_db`** -> Expand **`Tables`**.
5. Move your mouse over any table name (e.g., `students`, `menu_items`, `ingredients`) and click the **tiny Table Grid icon** on the right side of the name (or right-click the table and choose **Select Rows - Limit 1000**).
6. A spreadsheet grid will open showing all rows in the table.

#### How to Add a New Record:
- Scroll to the very bottom row of the grid (the row with a small `*` icon).
- Double-click each cell and type your values (e.g. name, email, balance).
- Leave the Primary Key ID (e.g., `student_id`, `item_id`) as `NULL` or blank — MySQL will automatically number it!
- Click the blue **Apply** button at the bottom-right corner.
- A popup window will show the generated SQL `INSERT` statement. Click **Apply**, then click **Finish**. Done!

#### How to Edit / Change an Existing Record:
- Double-click any cell you want to edit (e.g., change `wallet_balance` from `500.00` to `1000.00`, or edit a student's name).
- Type the new value and press **Enter**.
- Click the blue **Apply** button at the bottom-right corner.
- Click **Apply** -> **Finish**. The change is now live in the system!

#### How to Delete a Record:
- Right-click the grey row-number box on the far-left of the row you want to delete.
- Select **Delete Row(s)**.
- Click the blue **Apply** button at the bottom-right corner.
- Click **Apply** -> **Finish**.

---

### Method 2: Table-by-Table Guide & Quick SQL Commands

If you prefer running quick commands, open a **New SQL Tab** (`Ctrl + T`) in Workbench, make sure you write `USE canteen_db;` at the top, and use these copy-paste commands:

---

### 1. `students` Table
Stores registered students, their campus Google emails, and wallet balances.

| Column | Type | Description |
| :--- | :--- | :--- |
| `student_id` | INT (PK) | Auto-generated student ID |
| `reg_no` | VARCHAR(20) | Student Reg No (e.g., `24BCY10379`) |
| `full_name` | VARCHAR(100) | Full Name |
| `email` | VARCHAR(100) | Campus Google email (used to sign in) |
| `phone` | VARCHAR(15) | Contact phone number |
| `wallet_balance`| DECIMAL(10,2)| Campus digital wallet money |

#### Quick Actions:
- **View all students:**
  ```sql
  SELECT * FROM canteen_db.students;
  ```
- **Add a new student:**
  ```sql
  INSERT INTO canteen_db.students (reg_no, full_name, email, phone, wallet_balance)
  VALUES ('24BCY99999', 'Priya Patel', 'priya.patel@campus.edu', '9876543210', 500.00);
  ```
- **Add money to a student's wallet (e.g. ₹500):**
  ```sql
  UPDATE canteen_db.students 
  SET wallet_balance = wallet_balance + 500.00 
  WHERE email = 'shagun.24bcy10379@vitbhopal.ac.in';
  ```
- **Delete a student:**
  ```sql
  DELETE FROM canteen_db.students WHERE reg_no = '24BCY99999';
  ```

---

### 2. `kitchen_staff` Table
Stores chefs, cooks, and canteen staff who have access to the Kitchen Portal.

| Column | Type | Description |
| :--- | :--- | :--- |
| `staff_id` | INT (PK) | Auto-generated staff ID |
| `full_name` | VARCHAR(100) | Staff member name |
| `email` | VARCHAR(100) | Email (used to sign in to kitchen portal) |
| `role` | ENUM | `'Head Chef'`, `'Cook'`, `'Canteen Manager'` |
| `is_active` | BOOLEAN | `1` (Active) or `0` (Disabled) |

#### Quick Actions:
- **View all staff:**
  ```sql
  SELECT * FROM canteen_db.kitchen_staff;
  ```
- **Add a new chef or cook:**
  ```sql
  INSERT INTO canteen_db.kitchen_staff (full_name, email, role, is_active)
  VALUES ('Vikram Singh', 'vikram.chef@canteen.campus.edu', 'Cook', 1);
  ```
- **Promote staff to Canteen Manager:**
  ```sql
  UPDATE canteen_db.kitchen_staff 
  SET role = 'Canteen Manager' 
  WHERE email = 'shagun.24bcy10379@vitbhopal.ac.in';
  ```
- **Remove or deactivate staff:**
  ```sql
  DELETE FROM canteen_db.kitchen_staff WHERE email = 'vikram.chef@canteen.campus.edu';
  ```

---

### 3. `menu_items` Table
Stores dishes, prices, preparation times, and availability on the student menu.

| Column | Type | Description |
| :--- | :--- | :--- |
| `item_id` | INT (PK) | Auto-generated menu item ID |
| `category_id` | INT (FK) | 1 = South Indian, 2 = North Indian, 3 = Snacks, 4 = Beverages |
| `item_name` | VARCHAR(100) | Dish Name (e.g. `Paneer Butter Masala`) |
| `description` | TEXT | Description of ingredients/taste |
| `price` | DECIMAL(8,2) | Price in ₹ |
| `is_available`| BOOLEAN | `1` = Available on menu, `0` = Marked Sold Out |

#### Quick Actions:
- **View all dishes:**
  ```sql
  SELECT * FROM canteen_db.menu_items;
  ```
- **Add a new dish:**
  ```sql
  INSERT INTO canteen_db.menu_items (category_id, item_name, description, price, preparation_time_mins, is_available)
  VALUES (3, 'Veg Grilled Sandwich', 'Toasted triple-layer sandwich with fresh veggies and mint chutney', 60.00, 8, 1);
  ```
- **Change the price of a dish (Trigger automatically logs this in `price_audit_log`!):**
  ```sql
  UPDATE canteen_db.menu_items 
  SET price = 70.00 
  WHERE item_name = 'Masala Dosa';
  ```
- **Mark an item as Sold Out:**
  ```sql
  UPDATE canteen_db.menu_items 
  SET is_available = 0 
  WHERE item_name = 'Mango Lassi';
  ```
- **Delete a dish from menu:**
  ```sql
  DELETE FROM canteen_db.menu_items WHERE item_name = 'Veg Grilled Sandwich';
  ```

---

### 4. `ingredients` Table
Stores raw kitchen inventory stocks and minimum alert thresholds.

| Column | Type | Description |
| :--- | :--- | :--- |
| `ingredient_id` | INT (PK) | Auto-generated raw material ID |
| `ingredient_name` | VARCHAR(100) | e.g. `Rice Batter`, `Coffee Beans`, `Paneer` |
| `unit` | VARCHAR(20) | `grams`, `ml`, `pieces` |
| `current_stock` | DECIMAL(10,2)| Current quantity available in kitchen |
| `min_threshold` | DECIMAL(10,2)| Low stock warning limit |

#### Quick Actions:
- **View all inventory levels:**
  ```sql
  SELECT ingredient_id, ingredient_name, current_stock, unit, min_threshold 
  FROM canteen_db.ingredients;
  ```
- **Restock raw materials (e.g. add 5,000 grams of Paneer):**
  ```sql
  UPDATE canteen_db.ingredients 
  SET current_stock = current_stock + 5000.00 
  WHERE ingredient_name = 'Paneer';
  ```
- **Add a new ingredient:**
  ```sql
  INSERT INTO canteen_db.ingredients (ingredient_name, unit, current_stock, min_threshold, cost_per_unit)
  VALUES ('Butter', 'grams', 3000.00, 500.00, 0.60);
  ```

---

### 5. `orders` & `order_items` Table
Stores customer orders, assigned Token Numbers, cooking status, and totals.

| Column | Type | Description |
| :--- | :--- | :--- |
| `order_id` | INT (PK) | Official **Token Number** shown in Kitchen KDS |
| `student_id` | INT (FK) | ID of the student who placed the order |
| `status` | ENUM | `'Placed'`, `'Preparing'`, `'Ready'`, `'Picked Up'`, `'Cancelled'` |
| `total_amount` | DECIMAL(10,2)| Total cost paid |

#### Quick Actions:
- **View all active kitchen orders by Token Number:**
  ```sql
  SELECT order_id AS token_no, status, total_amount, order_date 
  FROM canteen_db.orders 
  WHERE status != 'Picked Up' 
  ORDER BY order_id ASC;
  ```
- **Manually advance an order to Ready for Pickup:**
  ```sql
  UPDATE canteen_db.orders 
  SET status = 'Ready' 
  WHERE order_id = 1;
  ```

---

### 6. `feedback` Table
Stores student ratings (1 to 5 stars) and comments.

#### Quick Actions:
- **View student ratings and reviews:**
  ```sql
  SELECT f.rating, f.comments, s.full_name, f.created_at 
  FROM canteen_db.feedback f
  JOIN canteen_db.students s ON f.student_id = s.student_id
  ORDER BY f.created_at DESC;
  ```

---

## Part 3: Important Rules & Best Practices for MySQL Workbench

1. **Always Click the Blue "Apply" Button**:
   When using the visual spreadsheet editor in MySQL Workbench, edits remain in a draft state on your screen until you click **Apply** at the bottom-right.
2. **Do Not Manually Type IDs with `AUTO_INCREMENT`**:
   Columns like `student_id`, `item_id`, `ingredient_id`, and `order_id` are automatically assigned numbers by MySQL. Leave them blank when adding new rows.
3. **Foreign Key Protection**:
   If you try to delete an ingredient that is currently listed in a dish's recipe (`item_ingredients`), MySQL will safely block the deletion to protect database integrity. Delete the recipe row first if you wish to remove the ingredient permanently.
4. **Instant Web Application Sync**:
   Any changes you make in MySQL Workbench (such as adding money, creating dishes, updating prices, or restocking inventory) update the live web application **immediately** upon refresh!
