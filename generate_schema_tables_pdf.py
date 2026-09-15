import os
import sys
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
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
        
        # Header on pages 2+
        if self._pageNumber > 1:
            self.drawString(40, 810, "Smart Canteen Management System — Schema & Table Directory")
            self.drawRightString(555, 810, "Database: canteen_db (MySQL 8.0)")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 804, 555, 804)

        # Footer on all pages
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 42, 555, 42)
        self.drawString(40, 30, "Database Schema & Complete SQL DDL Specification • Smart Canteen System")
        self.drawRightString(555, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def create_code_box(sql_text, code_style):
    formatted = (
        sql_text.strip()
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('\n', '<br/>')
        .replace(' ', '&nbsp;')
    )
    para = Paragraph(f"<font face='Courier' size=6.8 color='#0f172a'>{formatted}</font>", code_style)
    t = Table([[para]], colWidths=[515])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    return t

def build_pdf():
    pdf_filename = "Schema_and_Tables_List.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=21,
        leading=25,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#475569"),
        alignment=1,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=colors.HexColor("#0284c7"),
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'THStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10,
        textColor=colors.white
    )

    cell_style = ParagraphStyle(
        'TDStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )

    code_cell_style = ParagraphStyle(
        'TDCodeStyle',
        parent=cell_style,
        fontName='Courier',
        fontSize=7.2,
        leading=9,
        textColor=colors.HexColor("#0f172a")
    )

    tag_style = ParagraphStyle(
        'TagStyle',
        parent=cell_style,
        fontName='Helvetica-Bold',
        fontSize=6.8,
        leading=8.5,
        textColor=colors.HexColor("#0369a1")
    )

    code_block_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.8,
        leading=8.8,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # Title Banner
    story.append(Paragraph("SMART CANTEEN MANAGEMENT SYSTEM", title_style))
    story.append(Paragraph("Complete Database Schema, Tables Directory & SQL DDL Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=8))

    # Schema Overview Box
    overview_data = [
        [Paragraph("<b>Database Name:</b>", body_style), Paragraph("<code>canteen_db</code>", body_style),
         Paragraph("<b>Default Engine:</b>", body_style), Paragraph("InnoDB (Full ACID Support)", body_style)],
        [Paragraph("<b>Total Tables:</b>", body_style), Paragraph("12 Normalized Tables (3NF Compliant)", body_style),
         Paragraph("<b>Total Views:</b>", body_style), Paragraph("4 Analytical & KDS Views", body_style)],
        [Paragraph("<b>Character Set:</b>", body_style), Paragraph("utf8mb4 (Full Unicode / Multilingual)", body_style),
         Paragraph("<b>Triggers & Logic:</b>", body_style), Paragraph("Stock Deductions & Price Auditing", body_style)]
    ]
    overview_table = Table(overview_data, colWidths=[80, 175, 95, 165])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 8))

    # Quick Master Table Summary
    story.append(Paragraph("PART 1: Master Directory of All 12 Tables", h1_style))
    
    master_rows = [
        [Paragraph("<b>#</b>", table_header_style), Paragraph("<b>Table Name</b>", table_header_style), Paragraph("<b>Primary Key</b>", table_header_style), Paragraph("<b>Foreign Keys (Parent)</b>", table_header_style), Paragraph("<b>Primary Function in System</b>", table_header_style)],
        [Paragraph("1", cell_style), Paragraph("<code>students</code>", code_cell_style), Paragraph("student_id", cell_style), Paragraph("None", cell_style), Paragraph("Student accounts, Google login, campus wallet balance", cell_style)],
        [Paragraph("2", cell_style), Paragraph("<code>categories</code>", code_cell_style), Paragraph("category_id", cell_style), Paragraph("None", cell_style), Paragraph("Food menu categories (South Indian, Snacks, Beverages)", cell_style)],
        [Paragraph("3", cell_style), Paragraph("<code>menu_items</code>", code_cell_style), Paragraph("item_id", cell_style), Paragraph("category_id -> categories", cell_style), Paragraph("Food catalog, prices, prep time, availability toggle", cell_style)],
        [Paragraph("4", cell_style), Paragraph("<code>ingredients</code>", code_cell_style), Paragraph("ingredient_id", cell_style), Paragraph("None", cell_style), Paragraph("Raw materials kitchen stock, threshold alert levels", cell_style)],
        [Paragraph("5", cell_style), Paragraph("<code>item_ingredients</code>", code_cell_style), Paragraph("(item_id, ingredient_id)", cell_style), Paragraph("item_id, ingredient_id", cell_style), Paragraph("Bill of Materials (BOM) recipe composition (M:N link)", cell_style)],
        [Paragraph("6", cell_style), Paragraph("<code>orders</code>", code_cell_style), Paragraph("order_id", cell_style), Paragraph("student_id -> students", cell_style), Paragraph("Official Token Numbers, cooking status, order date", cell_style)],
        [Paragraph("7", cell_style), Paragraph("<code>order_items</code>", code_cell_style), Paragraph("order_item_id", cell_style), Paragraph("order_id, item_id", cell_style), Paragraph("Dishes contained in an order, quantity, subtotal", cell_style)],
        [Paragraph("8", cell_style), Paragraph("<code>payments</code>", code_cell_style), Paragraph("payment_id", cell_style), Paragraph("order_id -> orders", cell_style), Paragraph("Payment receipts, transaction refs (Wallet, UPI, Card)", cell_style)],
        [Paragraph("9", cell_style), Paragraph("<code>kitchen_staff</code>", code_cell_style), Paragraph("staff_id", cell_style), Paragraph("None", cell_style), Paragraph("Kitchen staff logins, chef roles (Head Chef, Cook)", cell_style)],
        [Paragraph("10", cell_style), Paragraph("<code>feedback</code>", code_cell_style), Paragraph("feedback_id", cell_style), Paragraph("order_id, student_id", cell_style), Paragraph("Student reviews and ratings (1 to 5 stars)", cell_style)],
        [Paragraph("11", cell_style), Paragraph("<code>inventory_logs</code>", code_cell_style), Paragraph("log_id", cell_style), Paragraph("ingredient_id -> ingredients", cell_style), Paragraph("Audit log of all stock deductions and restock events", cell_style)],
        [Paragraph("12", cell_style), Paragraph("<code>price_audit_log</code>", code_cell_style), Paragraph("audit_id", cell_style), Paragraph("item_id -> menu_items", cell_style), Paragraph("Trigger audit log recording all dish price changes", cell_style)],
    ]
    master_table = Table(master_rows, colWidths=[18, 92, 100, 115, 190])
    master_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(master_table)
    story.append(Spacer(1, 8))

    story.append(PageBreak())

    # SECTION 2: TABLE SPECIFICATIONS & COLUMNS
    story.append(Paragraph("PART 2: Detailed Table Columns & Constraints", h1_style))

    tables_detail = [
        (
            "1. Table: students",
            "Stores registered campus students, authentication credentials, and digital campus wallet balance.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["student_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique auto-generated student identifier"],
                ["reg_no", "VARCHAR(20)", "NOT NULL", "UNIQUE", "Campus student registration number (e.g. 24BCY10379)"],
                ["full_name", "VARCHAR(100)", "NOT NULL", "-", "Student's full legal name"],
                ["email", "VARCHAR(100)", "NOT NULL", "UNIQUE", "Campus Google account email used for portal authentication"],
                ["phone", "VARCHAR(15)", "NOT NULL", "-", "Contact phone number for notifications"],
                ["wallet_balance", "DECIMAL(10,2)", "NOT NULL DEFAULT 500.00", "CHECK (wallet_balance >= 0)", "Digital campus wallet balance in Rupees"],
                ["created_at", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Account registration timestamp"]
            ]
        ),
        (
            "2. Table: categories",
            "Organizes the canteen menu catalog into logical dining categories.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["category_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique category identifier"],
                ["category_name", "VARCHAR(50)", "NOT NULL", "UNIQUE", "Name of category (South Indian, North Indian, Beverages)"],
                ["description", "VARCHAR(255)", "NULL", "-", "Brief summary of category cuisine"]
            ]
        ),
        (
            "3. Table: menu_items",
            "Stores canteen food dishes, selling prices, prep times, and live availability toggles.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["item_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique dish identifier"],
                ["category_id", "INT", "NOT NULL", "FK -> categories (CASCADE)", "Category classification for this dish"],
                ["item_name", "VARCHAR(100)", "NOT NULL", "UNIQUE", "Name of food dish (e.g. Masala Dosa, Mango Lassi)"],
                ["description", "TEXT", "NULL", "-", "Detailed description of dish ingredients and preparation"],
                ["price", "DECIMAL(8,2)", "NOT NULL", "CHECK (price > 0)", "Selling price in Rupees"],
                ["preparation_time_mins", "INT", "DEFAULT 10", "CHECK (prep_time >= 0)", "Estimated kitchen prep time in minutes"],
                ["is_available", "BOOLEAN", "NOT NULL DEFAULT TRUE", "-", "1 = Active on student menu; 0 = Marked Sold Out"],
                ["image_url", "VARCHAR(255)", "NULL", "-", "Path to dish display image"],
                ["created_at", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Item creation timestamp"]
            ]
        ),
        (
            "4. Table: ingredients",
            "Tracks raw grocery items in the kitchen store, current quantities, and restock alert thresholds.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["ingredient_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique raw ingredient identifier"],
                ["ingredient_name", "VARCHAR(100)", "NOT NULL", "UNIQUE", "Name of raw grocery (Rice Batter, Coffee Beans, Paneer)"],
                ["unit", "VARCHAR(20)", "NOT NULL", "-", "Measurement unit: 'grams', 'ml', 'pieces'"],
                ["current_stock", "DECIMAL(10,2)", "NOT NULL DEFAULT 0.00", "CHECK (current_stock >= 0)", "Current physical stock in kitchen store"],
                ["min_threshold", "DECIMAL(10,2)", "NOT NULL DEFAULT 100.00", "CHECK (min_threshold >= 0)", "Minimum stock limit before low-stock alert triggers"],
                ["cost_per_unit", "DECIMAL(8,2)", "NOT NULL DEFAULT 0.00", "-", "Purchase cost per unit for inventory accounting"],
                ["last_restocked", "TIMESTAMP", "ON UPDATE CURRENT_TIMESTAMP", "-", "Timestamp of most recent restock event"]
            ]
        ),
        (
            "5. Table: item_ingredients (Bill of Materials - BOM)",
            "Resolves Many-to-Many (M:N) relationship between dishes and raw materials for automated stock deduction.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["item_id", "INT", "NOT NULL", "PK (Part 1), FK -> menu_items (CASCADE)", "Menu dish ID"],
                ["ingredient_id", "INT", "NOT NULL", "PK (Part 2), FK -> ingredients (RESTRICT)", "Required raw grocery ingredient ID"],
                ["quantity_required", "DECIMAL(8,2)", "NOT NULL", "CHECK (quantity_required > 0)", "Exact quantity of ingredient consumed per 1 serving"]
            ]
        ),
        (
            "6. Table: orders",
            "Central order record storing official Token Numbers, student references, and live cooking pipeline status.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["order_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY (Token #)", "Auto-increment token number displayed on KDS"],
                ["student_id", "INT", "NOT NULL", "FK -> students (RESTRICT)", "Student who placed and paid for the order"],
                ["order_date", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "INDEX idx_orders_date_status", "Timestamp when order was submitted"],
                ["status", "ENUM", "NOT NULL DEFAULT 'Placed'", "'Placed','Preparing','Ready','Picked Up','Cancelled'", "Current live workflow status in kitchen pipeline"],
                ["total_amount", "DECIMAL(10,2)", "NOT NULL DEFAULT 0.00", "CHECK (total_amount >= 0)", "Total amount charged for the order in Rupees"],
                ["special_instructions", "VARCHAR(255)", "NULL", "-", "Custom notes for the chef (e.g. 'Less spicy, extra chutney')"]
            ]
        ),
        (
            "7. Table: order_items",
            "Line items table storing individual dishes and quantities included within an order.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["order_item_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique line item identifier"],
                ["order_id", "INT", "NOT NULL", "FK -> orders (CASCADE)", "Reference to parent order / Token Number"],
                ["item_id", "INT", "NOT NULL", "FK -> menu_items (RESTRICT)", "Reference to the ordered menu dish"],
                ["quantity", "INT", "NOT NULL DEFAULT 1", "CHECK (quantity > 0)", "Number of portions ordered"],
                ["unit_price", "DECIMAL(8,2)", "NOT NULL", "-", "Locked-in unit price at the time of purchase"],
                ["subtotal", "DECIMAL(10,2)", "NOT NULL", "CHECK (subtotal >= 0)", "Total line cost = quantity * unit_price"]
            ]
        ),
        (
            "8. Table: payments",
            "Payment audit log linking 1-to-1 with orders to verify transaction references and payment channels.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["payment_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique payment transaction identifier"],
                ["order_id", "INT", "NOT NULL", "UNIQUE, FK -> orders (CASCADE)", "1-to-1 link to the corresponding order"],
                ["payment_method", "ENUM", "NOT NULL DEFAULT 'UPI'", "'UPI', 'Card', 'Cash', 'Student Wallet'", "Payment channel chosen by student"],
                ["payment_status", "ENUM", "NOT NULL DEFAULT 'Completed'", "'Pending', 'Completed', 'Failed', 'Refunded'", "Current status of financial transaction"],
                ["amount", "DECIMAL(10,2)", "NOT NULL", "CHECK (amount >= 0)", "Total amount collected in Rupees"],
                ["transaction_ref", "VARCHAR(64)", "NOT NULL", "UNIQUE", "Unique transaction reference code"],
                ["payment_time", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Timestamp of successful payment capture"]
            ]
        ),
        (
            "9. Table: kitchen_staff",
            "Staff registry for kitchen and canteen personnel managing the Kitchen Display System (KDS).",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["staff_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique staff member identifier"],
                ["full_name", "VARCHAR(100)", "NOT NULL", "-", "Staff member legal name"],
                ["email", "VARCHAR(100)", "NOT NULL", "UNIQUE", "Staff login email authenticated against database"],
                ["role", "ENUM", "NOT NULL DEFAULT 'Cook'", "'Head Chef', 'Cook', 'Canteen Manager'", "Role-based access permissions"],
                ["is_active", "BOOLEAN", "NOT NULL DEFAULT TRUE", "-", "1 = Active staff member; 0 = Deactivated account"],
                ["created_at", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Account creation timestamp"]
            ]
        ),
        (
            "10. Table: feedback",
            "Customer quality ratings and review comments submitted by students upon meal completion.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["feedback_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique review identifier"],
                ["order_id", "INT", "NOT NULL", "FK -> orders (CASCADE)", "Reference to the fulfilled order"],
                ["student_id", "INT", "NOT NULL", "FK -> students (CASCADE)", "Student who submitted the review"],
                ["rating", "INT", "NOT NULL", "CHECK (rating BETWEEN 1 AND 5)", "Numerical satisfaction rating from 1 to 5 stars"],
                ["comments", "TEXT", "NULL", "-", "Optional student comments on food taste, hygiene, or speed"],
                ["created_at", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Submission timestamp"]
            ]
        ),
        (
            "11. Table: inventory_logs",
            "Immutable audit trail logging every stock deduction and restock transaction in the kitchen store.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["log_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique stock log identifier"],
                ["ingredient_id", "INT", "NOT NULL", "FK -> ingredients (CASCADE)", "Ingredient whose quantity was changed"],
                ["change_type", "ENUM", "NOT NULL", "'DEDUCTION_ORDER', 'RESTOCK_MANUAL', 'ADJUSTMENT'", "Reason for inventory stock change"],
                ["quantity_changed", "DECIMAL(10,2)", "NOT NULL", "-", "Amount deducted (-) or added (+) in ingredient units"],
                ["remaining_stock", "DECIMAL(10,2)", "NOT NULL", "-", "Exact balance remaining after the change occurred"],
                ["reference_order_id", "INT", "NULL", "-", "Associated Token Number if deduction was triggered by an order"],
                ["created_at", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Exact timestamp of stock change"]
            ]
        ),
        (
            "12. Table: price_audit_log",
            "Audit table populated automatically by trigger whenever a dish price is altered.",
            [
                ["Column Name", "Data Type", "Null / Default", "Constraints & Key", "Description"],
                ["audit_id", "INT", "NOT NULL, AUTO_INCREMENT", "PRIMARY KEY", "Unique audit record identifier"],
                ["item_id", "INT", "NOT NULL", "-", "Menu dish ID whose price was modified"],
                ["old_price", "DECIMAL(8,2)", "NOT NULL", "-", "Previous selling price in Rupees"],
                ["new_price", "DECIMAL(8,2)", "NOT NULL", "-", "New updated selling price in Rupees"],
                ["changed_at", "TIMESTAMP", "DEFAULT CURRENT_TIMESTAMP", "-", "Timestamp when price update was committed"],
                ["changed_by", "VARCHAR(50)", "DEFAULT 'ADMIN'", "-", "Database user session that executed the UPDATE"]
            ]
        )
    ]

    for table_name, table_desc, col_rows in tables_detail:
        t_flow = []
        t_flow.append(Paragraph(table_name, h2_style))
        t_flow.append(Paragraph(f"<i>{table_desc}</i>", body_style))
        
        table_grid_data = []
        table_grid_data.append([Paragraph(f"<b>{c}</b>", table_header_style) for c in col_rows[0]])
        for r in col_rows[1:]:
            row_items = []
            for i, val in enumerate(r):
                if i == 0:
                    row_items.append(Paragraph(f"<code>{val}</code>", code_cell_style))
                elif i == 3 and ("KEY" in val or "FK" in val or "CHECK" in val):
                    row_items.append(Paragraph(f"<b>{val}</b>", tag_style))
                else:
                    row_items.append(Paragraph(val, cell_style))
            table_grid_data.append(row_items)
            
        t_grid = Table(table_grid_data, colWidths=[105, 80, 110, 100, 120])
        t_grid.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
            ('TOPPADDING', (0,0), (-1,-1), 1.8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1.8),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ]))
        t_flow.append(t_grid)
        t_flow.append(Spacer(1, 6))
        story.append(KeepTogether(t_flow))

    story.append(PageBreak())

    # SECTION 3: VIEWS & PROCEDURES SPECIFICATION
    story.append(Paragraph("PART 3: Database Views, Triggers & Procedures Directory", h1_style))
    story.append(Paragraph("The system defines 4 Views, 2 Automated Triggers, and 3 Stored Procedures/Functions:", body_style))

    views_data = [
        [Paragraph("<b>View Name</b>", table_header_style), Paragraph("<b>Underlying Tables</b>", table_header_style), Paragraph("<b>Business Function & Query Logic</b>", table_header_style)],
        [
            Paragraph("<code>vw_live_menu</code>", code_cell_style),
            Paragraph("menu_items, categories, item_ingredients, ingredients", cell_style),
            Paragraph("Computes real-time stock availability for every dish. If any ingredient required in the recipe has depleted, automatically flags dish as 'Out of Stock'.", cell_style)
        ],
        [
            Paragraph("<code>vw_kitchen_queue</code>", code_cell_style),
            Paragraph("orders, students, order_items, menu_items", cell_style),
            Paragraph("Powers the Kitchen Display System (KDS). Joins orders with students and groups order items into a single string summary (e.g. '2x Masala Dosa, 1x Mango Lassi').", cell_style)
        ],
        [
            Paragraph("<code>vw_low_stock_alerts</code>", code_cell_style),
            Paragraph("ingredients", cell_style),
            Paragraph("Filters inventory items where current_stock &lt;= min_threshold. Calculates exact deficit amount and assigns urgency level ('WARNING', 'HIGH', 'CRITICAL').", cell_style)
        ],
        [
            Paragraph("<code>vw_daily_sales_summary</code>", code_cell_style),
            Paragraph("orders", cell_style),
            Paragraph("Aggregates daily sales performance: total orders count, gross sales volume, fulfilled revenue, and average ticket size.", cell_style)
        ]
    ]
    views_table = Table(views_data, colWidths=[120, 130, 265])
    views_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(views_table)
    story.append(Spacer(1, 8))

    prog_data = [
        [Paragraph("<b>Component Type</b>", table_header_style), Paragraph("<b>Object Name</b>", table_header_style), Paragraph("<b>Event / Signature</b>", table_header_style), Paragraph("<b>Description</b>", table_header_style)],
        [
            Paragraph("TRIGGER", tag_style),
            Paragraph("<code>trg_check_and_deduct_stock</code>", code_cell_style),
            Paragraph("AFTER INSERT ON order_items", cell_style),
            Paragraph("Automatically deducts recipe ingredients from stock; aborts order if ingredients are insufficient.", cell_style)
        ],
        [
            Paragraph("TRIGGER", tag_style),
            Paragraph("<code>trg_audit_price_change</code>", code_cell_style),
            Paragraph("BEFORE UPDATE ON menu_items", cell_style),
            Paragraph("Logs old price, new price, user, and timestamp into price_audit_log upon price alteration.", cell_style)
        ],
        [
            Paragraph("PROCEDURE", tag_style),
            Paragraph("<code>sp_update_order_status</code>", code_cell_style),
            Paragraph("(p_order_id, p_new_status)", cell_style),
            Paragraph("Advances order status safely along cooking pipeline (Placed -> Preparing -> Ready -> Picked Up).", cell_style)
        ],
        [
            Paragraph("PROCEDURE", tag_style),
            Paragraph("<code>sp_restock_ingredient</code>", code_cell_style),
            Paragraph("(p_ingredient_id, p_quantity)", cell_style),
            Paragraph("Increases stock for specified raw grocery material and records transaction in inventory_logs.", cell_style)
        ],
        [
            Paragraph("FUNCTION", tag_style),
            Paragraph("<code>fn_calculate_bill</code>", code_cell_style),
            Paragraph("(p_subtotal, p_tax_rate)", cell_style),
            Paragraph("Calculates final bill amount including campus facility charge / tax percentage.", cell_style)
        ]
    ]
    prog_table = Table(prog_data, colWidths=[70, 140, 130, 175])
    prog_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(prog_table)

    story.append(PageBreak())

    # SECTION 4: COMPLETE SQL DDL SCHEMA STATEMENTS
    story.append(Paragraph("PART 4: Complete SQL DDL Schema Code (Create Table Statements)", h1_style))
    story.append(Paragraph(
        "Below are the exact, complete, copy-pasteable MySQL 8.0 DDL statements for creating the entire database schema:", body_style
    ))

    sql_ddl_statements = [
        (
            "Database Initialization",
            """CREATE DATABASE IF NOT EXISTS canteen_db;
USE canteen_db;"""
        ),
        (
            "1. Table: students",
            """CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    reg_no VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wallet_positive CHECK (wallet_balance >= 0)
) ENGINE=InnoDB;"""
        ),
        (
            "2. Table: categories",
            """CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB;"""
        ),
        (
            "3. Table: menu_items",
            """CREATE TABLE menu_items (
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
) ENGINE=InnoDB;"""
        ),
        (
            "4. Table: ingredients (Raw Kitchen Inventory)",
            """CREATE TABLE ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    min_threshold DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    cost_per_unit DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    last_restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_non_negative CHECK (current_stock >= 0),
    CONSTRAINT chk_threshold_positive CHECK (min_threshold >= 0)
) ENGINE=InnoDB;"""
        ),
        (
            "5. Table: item_ingredients (Bill of Materials - BOM)",
            """CREATE TABLE item_ingredients (
    item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_required DECIMAL(8, 2) NOT NULL,
    PRIMARY KEY (item_id, ingredient_id),
    CONSTRAINT fk_recipe_item FOREIGN KEY (item_id) 
        REFERENCES menu_items(item_id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_ingredient FOREIGN KEY (ingredient_id) 
        REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
    CONSTRAINT chk_qty_req CHECK (quantity_required > 0)
) ENGINE=InnoDB;"""
        ),
        (
            "6. Table: orders (Token Number Queue)",
            """CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Placed', 'Preparing', 'Ready', 'Picked Up', 'Cancelled') NOT NULL DEFAULT 'Placed',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    special_instructions VARCHAR(255),
    CONSTRAINT fk_orders_student FOREIGN KEY (student_id) 
        REFERENCES students(student_id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_total CHECK (total_amount >= 0)
) ENGINE=InnoDB;"""
        ),
        (
            "7. Table: order_items",
            """CREATE TABLE order_items (
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
) ENGINE=InnoDB;"""
        ),
        (
            "8. Table: payments",
            """CREATE TABLE payments (
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
) ENGINE=InnoDB;"""
        ),
        (
            "9. Table: kitchen_staff",
            """CREATE TABLE kitchen_staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('Head Chef', 'Cook', 'Canteen Manager') NOT NULL DEFAULT 'Cook',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;"""
        ),
        (
            "10. Table: feedback",
            """CREATE TABLE feedback (
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
) ENGINE=InnoDB;"""
        ),
        (
            "11. Table: inventory_logs",
            """CREATE TABLE inventory_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    change_type ENUM('DEDUCTION_ORDER', 'RESTOCK_MANUAL', 'ADJUSTMENT') NOT NULL,
    quantity_changed DECIMAL(10, 2) NOT NULL,
    remaining_stock DECIMAL(10, 2) NOT NULL,
    reference_order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invlog_ingredient FOREIGN KEY (ingredient_id) 
        REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
) ENGINE=InnoDB;"""
        ),
        (
            "12. Table: price_audit_log",
            """CREATE TABLE price_audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    old_price DECIMAL(8, 2) NOT NULL,
    new_price DECIMAL(8, 2) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(50) DEFAULT 'ADMIN'
) ENGINE=InnoDB;"""
        ),
        (
            "Database Indexes for Optimization",
            """CREATE INDEX idx_orders_date_status ON orders(order_date, status);
CREATE INDEX idx_orders_student ON orders(student_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);
CREATE INDEX idx_ingredients_stock ON ingredients(current_stock, min_threshold);
CREATE INDEX idx_menu_category ON menu_items(category_id, is_available);"""
        )
    ]

    for title, code_snippet in sql_ddl_statements:
        ddl_flow = []
        ddl_flow.append(Paragraph(f"<b>{title}</b>", h2_style))
        ddl_flow.append(create_code_box(code_snippet, code_block_style))
        ddl_flow.append(Spacer(1, 3))
        story.append(KeepTogether(ddl_flow))

    # SECTION 5: SQL DDL FOR VIEWS & TRIGGERS
    story.append(Spacer(1, 6))
    story.append(Paragraph("PART 5: SQL DDL for Views & Automated Triggers", h1_style))

    views_and_triggers_sql = [
        (
            "View: vw_live_menu",
            """CREATE OR REPLACE VIEW vw_live_menu AS
SELECT 
    m.item_id, m.item_name, c.category_name, m.description, m.price,
    m.preparation_time_mins, m.is_available,
    CASE 
        WHEN MIN(COALESCE(i.current_stock - ii.quantity_required, 0)) >= 0 THEN 'In Stock'
        ELSE 'Out of Stock'
    END AS stock_status
FROM menu_items m
JOIN categories c ON m.category_id = c.category_id
LEFT JOIN item_ingredients ii ON m.item_id = ii.item_id
LEFT JOIN ingredients i ON ii.ingredient_id = i.ingredient_id
GROUP BY m.item_id, m.item_name, c.category_name, m.description, m.price, m.preparation_time_mins, m.is_available;"""
        ),
        (
            "View: vw_kitchen_queue (Kitchen Display System)",
            """CREATE OR REPLACE VIEW vw_kitchen_queue AS
SELECT 
    o.order_id, s.reg_no, s.full_name AS student_name, o.status,
    o.total_amount, o.special_instructions, o.order_date,
    TIMESTAMPDIFF(MINUTE, o.order_date, NOW()) AS elapsed_minutes,
    GROUP_CONCAT(CONCAT(oi.quantity, 'x ', mi.item_name) SEPARATOR ', ') AS item_summary
FROM orders o
JOIN students s ON o.student_id = s.student_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN menu_items mi ON oi.item_id = mi.item_id
WHERE o.status IN ('Placed', 'Preparing', 'Ready')
GROUP BY o.order_id, s.reg_no, s.full_name, o.status, o.total_amount, o.special_instructions, o.order_date
ORDER BY 
    CASE o.status WHEN 'Placed' THEN 1 WHEN 'Preparing' THEN 2 WHEN 'Ready' THEN 3 END,
    o.order_date ASC;"""
        ),
        (
            "Trigger: trg_check_and_deduct_stock (Automated Inventory BOM)",
            """DELIMITER //
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

    DECLARE cur_recipe CURSOR FOR
        SELECT ii.ingredient_id, ii.quantity_required, i.current_stock, i.ingredient_name
        FROM item_ingredients ii
        JOIN ingredients i ON ii.ingredient_id = i.ingredient_id
        WHERE ii.item_id = NEW.item_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_recipe;
    recipe_loop: LOOP
        FETCH cur_recipe INTO v_ing_id, v_qty_req, v_curr_stock, v_ing_name;
        IF done THEN LEAVE recipe_loop; END IF;

        SET v_needed = v_qty_req * NEW.quantity;
        IF v_curr_stock < v_needed THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'INSUFFICIENT_STOCK: Out of required ingredient for order';
        END IF;

        UPDATE ingredients SET current_stock = current_stock - v_needed WHERE ingredient_id = v_ing_id;
        INSERT INTO inventory_logs (ingredient_id, change_type, quantity_changed, remaining_stock, reference_order_id)
        VALUES (v_ing_id, 'DEDUCTION_ORDER', v_needed, v_curr_stock - v_needed, NEW.order_id);
    END LOOP;
    CLOSE cur_recipe;
END //
DELIMITER ;"""
        ),
        (
            "Trigger: trg_audit_price_change",
            """DELIMITER //
CREATE TRIGGER trg_audit_price_change
BEFORE UPDATE ON menu_items
FOR EACH ROW
BEGIN
    IF OLD.price <> NEW.price THEN
        INSERT INTO price_audit_log (item_id, old_price, new_price, changed_at, changed_by)
        VALUES (OLD.item_id, OLD.price, NEW.price, NOW(), CURRENT_USER());
    END IF;
END //
DELIMITER ;"""
        )
    ]

    for title, code_snippet in views_and_triggers_sql:
        vt_flow = []
        vt_flow.append(Paragraph(f"<b>{title}</b>", h2_style))
        vt_flow.append(create_code_box(code_snippet, code_block_style))
        vt_flow.append(Spacer(1, 3))
        story.append(KeepTogether(vt_flow))

    # Build Document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {pdf_filename}")

    # Copy as Database_Schema_and_Tables.pdf as well
    alt_filename = "Database_Schema_and_Tables.pdf"
    shutil.copyfile(pdf_filename, alt_filename)
    print(f"Also copied as {alt_filename}")

if __name__ == '__main__':
    build_pdf()
