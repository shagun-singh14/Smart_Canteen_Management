import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages after page 1)
        if self._pageNumber > 1:
            self.drawString(40, 810, "Smart Canteen Management System — DBMS Project Report")
            self.drawRightString(555, 810, "MySQL 8.0 • InnoDB Engine")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 804, 555, 804)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 42, 555, 42)
        self.drawString(40, 30, "Project Report & MySQL Workbench Guide • Author: Shagun Singh")
        self.drawRightString(555, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf():
    pdf_filename = "Project_Report.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0f172a"),
        alignment=1, # Center
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
        alignment=1,
        spaceAfter=15
    )
    
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=1
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0369a1"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )
    
    concept_title_style = ParagraphStyle(
        'ConceptTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#0f172a")
    )
    
    concept_simple_style = ParagraphStyle(
        'ConceptSimple',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0284c7")
    )

    story = []

    # Title Banner
    story.append(Paragraph("SMART CANTEEN MANAGEMENT SYSTEM", title_style))
    story.append(Paragraph("Comprehensive Database Management Systems (DBMS) Project Report & Implementation Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

    # Meta Info Card Table
    meta_data = [
        [Paragraph("<b>Lead Developer:</b>", body_style), Paragraph("Shagun Singh (Reg No: 24BCY10379)", body_style)],
        [Paragraph("<b>Target Database:</b>", body_style), Paragraph("MySQL 8.0 (InnoDB Transactional Storage Engine)", body_style)],
        [Paragraph("<b>Database Schema:</b>", body_style), Paragraph("<code>canteen_db</code> (12 Normalized Relational Tables)", body_style)],
        [Paragraph("<b>Full Stack Stack:</b>", body_style), Paragraph("HTML5 / Modern Dark Glassmorphism CSS / Node.js Express REST API", body_style)],
        [Paragraph("<b>Core DBMS Principles:</b>", body_style), Paragraph("3NF Normalization, ACID Transactions, Triggers, Stored Procedures, Views, B-Tree Indexes", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[130, 385])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Architecture Overview
    story.append(Paragraph("System Architecture & Data Flow", h1_style))
    story.append(Paragraph(
        "The Smart Canteen Management System operates on a multi-tier client-server architecture where user actions "
        "on the student ordering portal and kitchen display system (KDS) interact with a MySQL 8.0 relational database. "
        "All business logic (stock deduction, price auditing, token queues) is maintained directly through database constraints, "
        "stored procedures, and automated triggers.", body_style
    ))

    arch_diagram = """
+---------------------------------------------------------------------------------------------------+
|                              SMART CANTEEN SYSTEM ARCHITECTURE                                    |
+---------------------------------------------------------------------------------------------------+
|  [Student Ordering Portal]           [Kitchen Display System (KDS)]          [Inventory & BOM]    |
|   - Live Digital Menu & Wallet        - Real-Time Token Number Queue          - Recipe Ingredients |
|   - Instant Checkout & Receipts       - Order States: Placed->Prep->Ready     - Auto Stock Deduct  |
+---------------------------------------------------------------------------------------------------+
                                                 |
                                                 v  (RESTful JSON API / Express.js)
+---------------------------------------------------------------------------------------------------+
|                                       MYSQL 8.0 DATABASE                                          |
|  1. Relational Schema & 3NF Normalization (12 Interrelated Tables)                                |
|  2. ACID Transactions (START TRANSACTION, COMMIT, ROLLBACK via InnoDB)                            |
|  3. Automated Database Triggers (Recipe stock deduction on order items, price change auditing)   |
|  4. Stored Procedures & Functions (sp_update_order_status, sp_restock_ingredient)                 |
|  5. Referential Integrity & Domain Constraints (CHECK, UNIQUE, FOREIGN KEY CASCADE/RESTRICT)      |
|  6. Views & Aggregations (v_active_kds_queue, v_daily_sales_summary, peak rush hours)             |
|  7. B-Tree Indexes (High-speed sub-millisecond query optimization)                                |
+---------------------------------------------------------------------------------------------------+
"""
    diag_table = Table([[Paragraph(f"<font face='Courier' size=6.5 color='#0f172a'>{arch_diagram.replace(' ', '&nbsp;').replace(chr(10), '<br/>')}</font>", body_style)]], colWidths=[515])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 10))

    # SECTION 1
    story.append(Paragraph("PART 1: Core DBMS Concepts Implemented & Where They Work", h1_style))

    concepts = [
        (
            "1. Relational Schema & 3NF Normalization",
            "In Simple Words: Splitting information into clean, specialized tables linked by IDs so data is never duplicated or inconsistent.",
            "Where It Is Used in Code:",
            [
                "<b>students:</b> Stores only student records (registration number, full name, email, wallet balance).",
                "<b>categories:</b> Stores food categories (South Indian, North Indian, Snacks, Beverages).",
                "<b>menu_items:</b> Stores dishes, prices, and preparation times.",
                "<b>ingredients:</b> Stores kitchen inventory raw materials (Rice Batter, Coffee Beans, Paneer, Milk).",
                "<b>item_ingredients (Bill of Materials):</b> Resolves the <b>Many-to-Many (M:N)</b> relationship between dishes and raw materials. One dish requires multiple ingredients; one ingredient is shared across multiple dishes.",
                "<b>orders & order_items:</b> Separates order headers from line items. A student can order 3 items in 1 checkout without repeating student details (1NF, 2NF, 3NF compliance)."
            ]
        ),
        (
            "2. Primary Keys, Foreign Keys & Referential Integrity",
            "In Simple Words: Primary keys are unique barcodes for each row. Foreign keys link tables together and prevent invalid records.",
            "Where It Is Used in Code:",
            [
                "<b>students.student_id (PK) -> orders.student_id (FK):</b> An unregistered student can never place an order.",
                "<b>categories.category_id -> menu_items.category_id with ON DELETE CASCADE:</b> If a category is removed, its items are safely managed.",
                "<b>ingredients.ingredient_id -> item_ingredients.ingredient_id with ON DELETE RESTRICT:</b> The database strictly prevents accidental deletion of 'Milk' or 'Rice' if an existing recipe relies on it!"
            ]
        ),
        (
            "3. Domain Integrity & Validation Constraints",
            "In Simple Words: Strict rules written into MySQL so negative balances or wrong numbers are rejected automatically.",
            "Where It Is Used in Code:",
            [
                "<b>CHECK (wallet_balance >= 0):</b> Guarantees a student's campus wallet balance can never fall below zero.",
                "<b>CHECK (price > 0):</b> Ensures all menu items have a valid positive selling price.",
                "<b>CHECK (rating BETWEEN 1 AND 5):</b> In the feedback table, ensures star reviews are strictly between 1 and 5.",
                "<b>UNIQUE (email) & UNIQUE (reg_no):</b> Rejects duplicate student or staff registrations.",
                "<b>ENUM Domains:</b> Restricts statuses to valid workflow stages: <code>orders.status ('Placed', 'Preparing', 'Ready', 'Picked Up', 'Cancelled')</code> and <code>payments.payment_method ('Student Wallet', 'UPI', 'Card', 'Cash')</code>."
            ]
        ),
        (
            "4. ACID Transactions (Transaction Processing)",
            "In Simple Words: Ensuring multi-step purchases succeed completely or fail completely with zero lost money or half-created orders.",
            "Where It Is Used in Code (server/index.js & database/04_transactions_demo.sql):",
            [
                "<b>Atomicity:</b> Placing an order requires: (1) deducting student balance, (2) creating the order record, (3) creating order line items, and (4) deducting recipe stock. If any step fails, <code>ROLLBACK</code> undoes everything.",
                "<b>Consistency:</b> The database moves from one valid state to another, satisfying all CHECK and FK constraints.",
                "<b>Isolation:</b> InnoDB row-level locking ensures that if two students order the last Samosa simultaneously, race conditions cannot oversell stock.",
                "<b>Durability:</b> Once <code>COMMIT</code> is executed, the transaction is permanently written to the redo log and survives server restarts."
            ]
        ),
        (
            "5. Database Triggers (Active Database)",
            "In Simple Words: Programs stored in MySQL that run automatically whenever a table is modified.",
            "Where It Is Used in Code (database/03_procedures_and_triggers.sql):",
            [
                "<b>trg_check_and_deduct_stock (AFTER INSERT ON order_items):</b> When a dish is ordered, this trigger iterates through its recipe in <code>item_ingredients</code>, verifies stock availability, subtracts the required amounts from <code>ingredients</code>, and logs the change into <code>inventory_logs</code>. If stock is missing, it raises <code>SIGNAL SQLSTATE '45000'</code> aborting the order.",
                "<b>trg_audit_price_change (BEFORE UPDATE ON menu_items):</b> Every time a dish's price is updated, this trigger automatically logs the old price, new price, user, and timestamp into <code>price_audit_log</code> for financial transparency."
            ]
        ),
        (
            "6. Stored Procedures & User-Defined Functions",
            "In Simple Words: Pre-compiled SQL functions on the server that can be executed with a single call.",
            "Where It Is Used in Code (database/03_procedures_and_triggers.sql):",
            [
                "<b>sp_update_order_status(order_id, new_status):</b> Safely advances order status from Placed to Preparing, Ready, or Picked Up.",
                "<b>sp_restock_ingredient(ingredient_id, quantity):</b> Restocks raw material stock and logs the restock transaction.",
                "<b>fn_calculate_bill(subtotal, tax_rate):</b> Computes order totals with campus facility charges."
            ]
        ),
        (
            "7. Views & Analytics Aggregations (JOINs, GROUP BY, SUM, AVG)",
            "In Simple Words: Saved virtual tables that combine data and compute business summaries without manual calculations.",
            "Where It Is Used in Code (database/05_analytics_views_queries.sql):",
            [
                "<b>v_active_kds_queue:</b> Combines <code>orders</code>, <code>students</code>, and <code>order_items</code> to show token tickets on the Kitchen Display System.",
                "<b>v_daily_sales_summary:</b> Calculates gross revenue, total token count, and average order size.",
                "<b>v_inventory_stock_status:</b> Compares stock against threshold to flag <code>'OK'</code>, <code>'LOW STOCK'</code>, or <code>'CRITICAL'</code>.",
                "<b>Peak Rush Hour Query:</b> Groups orders by <code>HOUR(order_date)</code> to display busiest times of day."
            ]
        ),
        (
            "8. Storage Engine & Indexing",
            "In Simple Words: B-Tree indexes speed up lookups like a book index, finding records in microseconds.",
            "Where It Is Used in Code (database/01_schema.sql):",
            [
                "<b>idx_orders_date_status ON orders(order_date, status):</b> Makes the live kitchen queue load instantly.",
                "<b>idx_orders_student ON orders(student_id):</b> Speeds up student token queries.",
                "<b>idx_ingredients_stock ON ingredients(current_stock, min_threshold):</b> Powers real-time low-stock alerts."
            ]
        )
    ]

    for title, simple, detail_label, points in concepts:
        c_flow = []
        c_flow.append(Paragraph(title, concept_title_style))
        c_flow.append(Paragraph(simple, concept_simple_style))
        c_flow.append(Paragraph(f"<b>{detail_label}</b>", body_style))
        for p in points:
            c_flow.append(Paragraph(f"• {p}", bullet_style))
        c_flow.append(Spacer(1, 4))
        
        box_table = Table([[c_flow]], colWidths=[515])
        box_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('LINELEFT', (0,0), (0,0), 3.5, colors.HexColor("#0284c7")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(box_table)
        story.append(Spacer(1, 6))

    story.append(PageBreak())

    # SECTION 2: SCHEMA TABLE
    story.append(Paragraph("PART 2: Complete Database Schema Reference (12 Tables)", h1_style))
    story.append(Paragraph("The system is structured across 12 normalized tables adhering to 3NF standards:", body_style))

    schema_rows = [
        [Paragraph("<b>Table Name</b>", body_style), Paragraph("<b>Primary Key</b>", body_style), Paragraph("<b>Foreign Keys / Key Columns</b>", body_style), Paragraph("<b>Role in Canteen System</b>", body_style)],
        [Paragraph("<code>students</code>", code_style), Paragraph("student_id", body_style), Paragraph("reg_no (UQ), email (UQ), wallet_balance", body_style), Paragraph("Student accounts, Google login, campus wallet balance", body_style)],
        [Paragraph("<code>categories</code>", code_style), Paragraph("category_id", body_style), Paragraph("category_name (UQ), description", body_style), Paragraph("Food menu categories (South Indian, Beverages, etc.)", body_style)],
        [Paragraph("<code>menu_items</code>", code_style), Paragraph("item_id", body_style), Paragraph("category_id (FK), item_name (UQ), price", body_style), Paragraph("Dishes available on the student ordering catalog", body_style)],
        [Paragraph("<code>ingredients</code>", code_style), Paragraph("ingredient_id", body_style), Paragraph("ingredient_name (UQ), current_stock, min_threshold", body_style), Paragraph("Raw materials inventory levels in kitchen store", body_style)],
        [Paragraph("<code>item_ingredients</code>", code_style), Paragraph("(item_id, ingredient_id)", body_style), Paragraph("item_id (FK), ingredient_id (FK), quantity_required", body_style), Paragraph("Bill of Materials (BOM) dish recipes for auto deduction", body_style)],
        [Paragraph("<code>orders</code>", code_style), Paragraph("order_id", body_style), Paragraph("student_id (FK), status, total_amount, order_date", body_style), Paragraph("Order records and official Token Numbers for KDS", body_style)],
        [Paragraph("<code>order_items</code>", code_style), Paragraph("order_item_id", body_style), Paragraph("order_id (FK), item_id (FK), quantity, subtotal", body_style), Paragraph("Individual dishes included within an order", body_style)],
        [Paragraph("<code>payments</code>", code_style), Paragraph("payment_id", body_style), Paragraph("order_id (FK, UQ), payment_method, transaction_ref", body_style), Paragraph("Payment audit receipts and payment transaction references", body_style)],
        [Paragraph("<code>kitchen_staff</code>", code_style), Paragraph("staff_id", body_style), Paragraph("email (UQ), role, is_active", body_style), Paragraph("Chef and kitchen staff portal login authentication", body_style)],
        [Paragraph("<code>feedback</code>", code_style), Paragraph("feedback_id", body_style), Paragraph("order_id (FK), student_id (FK), rating (1-5)", body_style), Paragraph("Customer ratings and food quality reviews", body_style)],
        [Paragraph("<code>inventory_logs</code>", code_style), Paragraph("log_id", body_style), Paragraph("ingredient_id (FK), change_type, quantity_changed", body_style), Paragraph("Audit trail of all raw material deductions & restocks", body_style)],
        [Paragraph("<code>price_audit_log</code>", code_style), Paragraph("audit_id", body_style), Paragraph("item_id, old_price, new_price, changed_at", body_style), Paragraph("Automatic trigger audit trail of dish price modifications", body_style)]
    ]

    schema_table = Table(schema_rows, colWidths=[90, 80, 175, 170])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(schema_table)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # SECTION 3: WORKBENCH GUIDE
    story.append(Paragraph("PART 3: Step-by-Step MySQL Workbench Editing Guide", h1_style))
    story.append(Paragraph(
        "You can manage your canteen database in MySQL Workbench through two simple methods: "
        "<b>Visual Spreadsheet Grid Editing</b> (no SQL knowledge required) or <b>Direct SQL Commands</b>.", body_style
    ))

    story.append(Paragraph("Method 1: Visual Spreadsheet Editing (Like Microsoft Excel)", h2_style))
    
    steps = [
        ("1. Connect to MySQL Server:", "Open MySQL Workbench and double-click <b>Local instance 3306</b>. Enter your MySQL root password (<code>11658369_Sql</code>)."),
        ("2. Locate Database Tables:", "In the left sidebar under <b>Navigator</b>, click the <b>Schemas</b> tab. Expand <b>canteen_db</b> &gt; Expand <b>Tables</b>."),
        ("3. Open Table for Editing:", "Hover over any table (e.g., <code>students</code>, <code>menu_items</code>, <code>ingredients</code>) and click the <b>tiny Table Grid icon</b> on the right side. A spreadsheet will open."),
        ("4. How to Add a Row:", "Scroll down to the bottom empty row marked with an asterisk (<code>*</code>). Double-click the cells and type your values. Leave auto-increment ID columns blank. Click the blue <b>Apply</b> button at the bottom-right &gt; <b>Apply</b> &gt; <b>Finish</b>."),
        ("5. How to Edit a Row:", "Double-click any cell you want to change (e.g. modify a student's <code>wallet_balance</code> or a dish's <code>price</code>). Type the new value and press Enter. Click <b>Apply</b> &gt; <b>Apply</b> &gt; <b>Finish</b>."),
        ("6. How to Delete a Row:", "Right-click the grey row number box on the far left of the row you wish to delete. Choose <b>Delete Row(s)</b>. Click the blue <b>Apply</b> button &gt; <b>Apply</b> &gt; <b>Finish</b>.")
    ]

    for title, desc in steps:
        story.append(Paragraph(f"<b>{title}</b> {desc}", bullet_style))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Method 2: Quick Copy-Paste SQL Commands for Each Table", h2_style))
    story.append(Paragraph("Open a new SQL query tab in MySQL Workbench (<b>Ctrl + T</b>), write <code>USE canteen_db;</code>, and run any command below:", body_style))

    sql_examples = [
        (
            "1. Managing Students (students table)",
            """-- View all registered students
SELECT student_id, reg_no, full_name, email, wallet_balance FROM canteen_db.students;

-- Add a new student
INSERT INTO canteen_db.students (reg_no, full_name, email, phone, wallet_balance)
VALUES ('24BCY99999', 'Priya Patel', 'priya.patel@campus.edu', '9876543210', 500.00);

-- Add money to a student's wallet (e.g. Add Rs. 500 to Shagun Singh)
UPDATE canteen_db.students 
SET wallet_balance = wallet_balance + 500.00 
WHERE email = 'shagun.24bcy10379@vitbhopal.ac.in';

-- Delete a student
DELETE FROM canteen_db.students WHERE reg_no = '24BCY99999';"""
        ),
        (
            "2. Managing Kitchen Staff (kitchen_staff table)",
            """-- View all staff members
SELECT * FROM canteen_db.kitchen_staff;

-- Add a new chef
INSERT INTO canteen_db.kitchen_staff (full_name, email, role, is_active)
VALUES ('Vikram Singh', 'vikram.chef@canteen.campus.edu', 'Cook', 1);

-- Promote staff to Canteen Manager
UPDATE canteen_db.kitchen_staff 
SET role = 'Canteen Manager' 
WHERE email = 'shagun.24bcy10379@vitbhopal.ac.in';

-- Remove a staff member
DELETE FROM canteen_db.kitchen_staff WHERE email = 'vikram.chef@canteen.campus.edu';"""
        ),
        (
            "3. Managing Canteen Menu Dishes (menu_items table)",
            """-- View all menu items
SELECT item_id, item_name, price, is_available FROM canteen_db.menu_items;

-- Add a new dish (1=South Indian, 2=North Indian, 3=Snacks, 4=Beverages)
INSERT INTO canteen_db.menu_items (category_id, item_name, description, price, preparation_time_mins, is_available)
VALUES (3, 'Veg Grilled Sandwich', 'Toasted triple-layer sandwich with fresh veggies', 60.00, 8, 1);

-- Update dish price (Automatically logged in price_audit_log via Trigger!)
UPDATE canteen_db.menu_items 
SET price = 70.00 
WHERE item_name = 'Masala Dosa';

-- Mark a dish as Sold Out (0) or Available (1)
UPDATE canteen_db.menu_items 
SET is_available = 0 
WHERE item_name = 'Mango Lassi';

-- Delete a dish
DELETE FROM canteen_db.menu_items WHERE item_name = 'Veg Grilled Sandwich';"""
        ),
        (
            "4. Managing Raw Kitchen Stock (ingredients table)",
            """-- View inventory stock levels and alert thresholds
SELECT ingredient_id, ingredient_name, current_stock, unit, min_threshold 
FROM canteen_db.ingredients;

-- Restock raw materials (e.g. Add 5,000 grams of Paneer)
UPDATE canteen_db.ingredients 
SET current_stock = current_stock + 5000.00 
WHERE ingredient_name = 'Paneer';

-- Add a new raw grocery ingredient
INSERT INTO canteen_db.ingredients (ingredient_name, unit, current_stock, min_threshold, cost_per_unit)
VALUES ('Butter', 'grams', 3000.00, 500.00, 0.60);"""
        ),
        (
            "5. Tracking Orders & Kitchen Tokens (orders table)",
            """-- View active kitchen queue orders sorted by Token Number
SELECT order_id AS token_no, status, total_amount, order_date 
FROM canteen_db.orders 
WHERE status != 'Picked Up' 
ORDER BY order_id ASC;

-- Manually advance an order status to Ready for Pickup
UPDATE canteen_db.orders 
SET status = 'Ready' 
WHERE order_id = 1;"""
        )
    ]

    for title, code_snippet in sql_examples:
        story.append(Paragraph(f"<b>{title}</b>", body_style))
        c_lines = code_snippet.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace(chr(10), '<br/>').replace(' ', '&nbsp;')
        code_para = Paragraph(f"<font face='Courier' size=7 color='#0f172a'>{c_lines}</font>", code_style)
        t_code = Table([[code_para]], colWidths=[515])
        t_code.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_code)
        story.append(Spacer(1, 4))

    # Golden Rules Box
    rules = [
        "<b>1. Always Click the Blue 'Apply' Button:</b> In MySQL Workbench's visual editor, edits are not committed to disk until you click Apply.",
        "<b>2. Leave Auto-Increment IDs Blank:</b> Columns like <code>student_id</code>, <code>item_id</code>, and <code>order_id</code> are numbered automatically by MySQL.",
        "<b>3. Foreign Key Protection:</b> You cannot delete an ingredient if an existing dish recipe depends on it; delete the recipe row in <code>item_ingredients</code> first.",
        "<b>4. Live Instant Synchronization:</b> Any update you make in MySQL Workbench reflects in the web application immediately upon refreshing the page!"
    ]
    r_flow = [Paragraph("<b>Golden Rules to Remember:</b>", h2_style)]
    for r in rules:
        r_flow.append(Paragraph(f"• {r}", bullet_style))
    
    rules_table = Table([[r_flow]], colWidths=[515])
    rules_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
        ('LINELEFT', (0,0), (0,0), 3.5, colors.HexColor("#10b981")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 6))
    story.append(rules_table)

    # Build Document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {pdf_filename}")

if __name__ == '__main__':
    build_pdf()
