# 🍔 Smart Canteen Management System

A full-stack, enterprise-grade Canteen Management System with student ordering portals, live kitchen queue, inventory/BOM management, and role-based access.

---

## 🌟 Key Features

- **🎓 Student Portal**: 
  - Dynamic visual menu with category filtering (Snacks, Meals, Beverages, Desserts).
  - Real-time cart management with quantity controls and instant bill calculation.
  - Active Order Tracking with live status updates (Pending → Preparing → Ready → Completed).
  - Student Profile with wallet balance and recent order history.
- **👨‍🍳 Kitchen Portal**:
  - Live Kitchen Queue with one-click status transitions.
  - Inventory & Stock level tracking.
  - Bill of Materials (BOM) integration for recipe management.
- **🛡️ Robust Database Architecture**:
  - MySQL database with normalized relational schemas (Students, Faculty, Staff, Menu Items, Orders, Order Items, Inventory, Ingredients).
  - Automatic fallback to high-fidelity mock data mode if cloud MySQL is unavailable.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL](https://www.mysql.com/) (Optional for full DB persistence; built-in mock mode works out of the box)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/shagun-singh14/Smart_Canteen_Management.git
cd Smart_Canteen_Management

# Install dependencies
npm install
```

### 3. Setup Database (Optional)
If using local MySQL:
```bash
# Copy template environment file
cp .env.example .env

# Edit .env with your MySQL credentials, then initialize database
npm run init-db
```

### 4. Run the Application
```bash
npm start
```
Open your browser and navigate to: `http://localhost:3000`

On Windows, you can also simply double-click `run_canteen_system.bat`!

---

## ☁️ Deployment on Vercel

This repository is pre-configured with `vercel.json` and a serverless entry point at `api/index.js`.

1. Import this repository into [Vercel](https://vercel.com).
2. Framework Preset: **Other**.
3. Root Directory: `./`
4. Click **Deploy**.
5. *(Optional)* Add your Cloud MySQL connection details in Vercel **Settings > Environment Variables** (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
