// ============================================================
// SMART CANTEEN MANAGEMENT SYSTEM - FRONTEND APP LOGIC
// ============================================================

// State
let currentPortal = 'PORTAL_SELECT'; // 'PORTAL_SELECT' | 'STUDENT' | 'KITCHEN'
let currentUser = null; // { student_id or staff_id, full_name, email, ... }
let authTargetPortal = 'student';

let currentMenu = [];
let currentCategories = [];
let activeCategory = 'ALL';
let cart = []; // { item_id, item_name, price, quantity }
let selectedStarRating = 5;

// Registered database accounts for quick viva/presentation selection
const REGISTERED_ACCOUNTS = {
    student: [
        { name: 'Shagun Singh', email: 'shagun.24bcy10379@vitbhopal.ac.in', sub: '24BCY10379 (Bal: ₹1000)' },
        { name: 'Aarav Sharma', email: 'aarav.sharma@vitstudent.ac.in', sub: '23BCE1001 (Bal: ₹450)' },
        { name: 'Ananya Iyer', email: 'ananya.iyer@vitstudent.ac.in', sub: '23BCE1045 (Bal: ₹820)' },
        { name: 'Rohan Verma', email: 'rohan.verma@vitstudent.ac.in', sub: '23BCE1120 (Bal: ₹310)' },
        { name: 'Sneha Patel', email: 'sneha.patel@vitstudent.ac.in', sub: '23BCE1289 (Bal: ₹950)' }
    ],
    kitchen: [
        { name: 'Shagun Singh (Head Chef)', email: 'shagun.24bcy10379@vitbhopal.ac.in', sub: 'Head Chef' }
    ]
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await checkDbStatus();

    // Check if session exists in localStorage
    const savedPortal = localStorage.getItem('canteen_portal');
    const savedUser = localStorage.getItem('canteen_user');

    if (savedPortal && savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (savedPortal === 'student') {
                activateStudentPortal(currentUser);
            } else if (savedPortal === 'kitchen') {
                activateKitchenPortal(currentUser);
            }
        } catch (e) {
            navigateToPortalSelect();
        }
    } else {
        navigateToPortalSelect();
    }

    // Auto refresh active tokens / kitchen queue
    setInterval(() => {
        if (currentPortal === 'STUDENT' && currentUser) {
            loadStudentTokens();
        } else if (currentPortal === 'KITCHEN') {
            loadKitchenQueue();
        }
    }, 6000);
});

// ------------------------------------------------------------
// 1. DATABASE CONNECTION STATUS & CONFIG
// ------------------------------------------------------------
async function checkDbStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const badge = document.getElementById('dbStatusBadge');
        const text = document.getElementById('dbStatusText');

        if (badge && text) {
            if (data.isConnected) {
                badge.className = 'db-status-badge live';
                text.textContent = '● Live MySQL 8.0';
            } else {
                badge.className = 'db-status-badge demo';
                text.textContent = '● Offline Mode';
            }
        }

        const hostEl = document.getElementById('cfgHost');
        if (data.config && hostEl) {
            hostEl.value = data.config.host || '127.0.0.1';
            const portEl = document.getElementById('cfgPort');
            if (portEl) portEl.value = data.config.port || 3306;
            const userEl = document.getElementById('cfgUser');
            if (userEl) userEl.value = data.config.user || 'root';
            const dbEl = document.getElementById('cfgDatabase');
            if (dbEl) dbEl.value = data.config.database || 'canteen_db';
        }
    } catch (e) {
        console.warn('Status check notice:', e);
    }
}

function openDbSettingsModal() {
    const modal = document.getElementById('dbModal');
    if (modal) modal.style.display = 'flex';
}

function closeDbSettingsModal() {
    const modal = document.getElementById('dbModal');
    if (modal) modal.style.display = 'none';
}

async function saveDbConfig() {
    const host = document.getElementById('cfgHost').value;
    const port = document.getElementById('cfgPort').value;
    const user = document.getElementById('cfgUser').value;
    const password = document.getElementById('cfgPassword').value;
    const database = document.getElementById('cfgDatabase').value;
    const feedback = document.getElementById('dbConfigFeedback');

    feedback.style.display = 'block';
    feedback.textContent = 'Connecting to MySQL server and running migrations...';
    feedback.className = 'alert-box';

    try {
        const res = await fetch('/api/config/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, user, password, database })
        });
        const result = await res.json();

        if (result.success) {
            feedback.className = 'alert-box success';
            feedback.textContent = '✅ Connected successfully! MySQL canteen_db synchronized.';
            setTimeout(() => {
                closeDbSettingsModal();
                checkDbStatus();
                if (currentPortal === 'STUDENT') loadMenu();
                if (currentPortal === 'KITCHEN') {
                    loadKitchenQueue();
                    loadInventory();
                    loadAnalytics();
                }
            }, 1200);
        } else {
            feedback.className = 'alert-box danger';
            feedback.textContent = `❌ Connection Error: ${result.error}. Check password.`;
        }
    } catch (err) {
        feedback.className = 'alert-box danger';
        feedback.textContent = `Error: ${err.message}`;
    }
}

// ------------------------------------------------------------
// 2. PORTAL ROUTING & SCREEN SWITCHING
// ------------------------------------------------------------
function navigateToPortalSelect() {
    currentPortal = 'PORTAL_SELECT';
    document.getElementById('portalSelectScreen').classList.add('active');
    document.getElementById('studentPortalScreen').classList.remove('active');
    document.getElementById('kitchenPortalScreen').classList.remove('active');

    document.getElementById('userProfileHeader').style.display = 'none';
    document.getElementById('cartToggleBtn').style.display = 'none';
    window.scrollTo(0, 0);
}

function activateStudentPortal(user) {
    currentPortal = 'STUDENT';
    currentUser = user;
    localStorage.setItem('canteen_portal', 'student');
    localStorage.setItem('canteen_user', JSON.stringify(user));

    document.getElementById('portalSelectScreen').classList.remove('active');
    document.getElementById('studentPortalScreen').classList.add('active');
    document.getElementById('kitchenPortalScreen').classList.remove('active');

    // Update Header
    document.getElementById('userProfileHeader').style.display = 'flex';
    document.getElementById('userAvatar').textContent = '👨‍🎓';
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('userSub').textContent = user.reg_no || user.email;
    document.getElementById('cartToggleBtn').style.display = 'inline-flex';

    // Update Student Banner
    document.getElementById('studentWelcomeName').textContent = user.full_name;
    document.getElementById('studentRegPill').textContent = user.reg_no || 'Registered Student';
    document.getElementById('studentWalletVal').textContent = `₹${parseFloat(user.wallet_balance || 500).toFixed(2)}`;

    window.scrollTo(0, 0);
    loadMenu();
    loadStudentTokens();
}

function activateKitchenPortal(user) {
    currentPortal = 'KITCHEN';
    currentUser = user;
    localStorage.setItem('canteen_portal', 'kitchen');
    localStorage.setItem('canteen_user', JSON.stringify(user));

    document.getElementById('portalSelectScreen').classList.remove('active');
    document.getElementById('studentPortalScreen').classList.remove('active');
    document.getElementById('kitchenPortalScreen').classList.add('active');

    // Update Header
    document.getElementById('userProfileHeader').style.display = 'flex';
    document.getElementById('userAvatar').textContent = '👨‍🍳';
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('userSub').textContent = user.role || 'Kitchen Staff';
    document.getElementById('cartToggleBtn').style.display = 'none';

    window.scrollTo(0, 0);
    switchKitchenTab('kdsTab');
    loadKitchenQueue();
    loadInventory();
    loadAnalytics();
}

function logout() {
    localStorage.removeItem('canteen_portal');
    localStorage.removeItem('canteen_user');
    currentUser = null;
    cart = [];
    updateCartUI();
    navigateToPortalSelect();
}

// ------------------------------------------------------------
// 3. GOOGLE / EMAIL AUTHENTICATION
// ------------------------------------------------------------
function openGoogleAuthModal(portal) {
    authTargetPortal = portal;
    const modal = document.getElementById('googleAuthModal');
    const title = document.getElementById('authModalPortalTitle');
    const hint = document.getElementById('authTableHint');
    const input = document.getElementById('authEmailInput');
    const errBox = document.getElementById('authErrorMessage');
    const chipsContainer = document.getElementById('quickAccountsList');

    errBox.style.display = 'none';
    input.value = '';

    if (portal === 'student') {
        title.textContent = 'Student Sign In';
        if (hint) hint.textContent = 'Registered campus email address';
        input.placeholder = 'e.g. yourname@campus.edu';
    } else {
        title.textContent = 'Kitchen Staff Sign In';
        if (hint) hint.textContent = 'Registered kitchen staff email address';
        input.placeholder = 'e.g. chef@canteen.campus.edu';
    }

    // Render Quick Account Chips for easy testing
    const accounts = REGISTERED_ACCOUNTS[portal] || [];
    chipsContainer.innerHTML = accounts.map(acc => `
        <button type="button" class="quick-chip" onclick="selectQuickEmail('${acc.email}')">
            <strong>${acc.name}</strong> • ${acc.email}
        </button>
    `).join('');

    modal.style.display = 'flex';
}

function selectQuickEmail(email) {
    document.getElementById('authEmailInput').value = email;
    submitGoogleLogin();
}

function closeGoogleAuthModal() {
    document.getElementById('googleAuthModal').style.display = 'none';
}

async function submitGoogleLogin() {
    const email = document.getElementById('authEmailInput').value;
    const errBox = document.getElementById('authErrorMessage');

    if (!email || !email.trim()) {
        errBox.style.display = 'block';
        errBox.textContent = 'Please enter or select a registered Google email address.';
        return;
    }

    errBox.style.display = 'none';

    try {
        const res = await fetch('/api/auth/google-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), portal: authTargetPortal })
        });

        const data = await res.json();

        if (data.success) {
            closeGoogleAuthModal();
            if (authTargetPortal === 'student') {
                activateStudentPortal(data.user);
            } else {
                activateKitchenPortal(data.user);
            }
        } else {
            errBox.style.display = 'block';
            errBox.textContent = data.error || 'Authentication failed.';
        }
    } catch (err) {
        errBox.style.display = 'block';
        errBox.textContent = `Network error: ${err.message}`;
    }
}

// ------------------------------------------------------------
// 4. STUDENT PORTAL: MENU & CART
// ------------------------------------------------------------
async function loadMenu() {
    try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        currentCategories = data.categories || [];
        currentMenu = data.items || [];
        renderCategoryFilters();
        renderMenuGrid();
    } catch (e) {
        console.error('Error loading menu:', e);
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    let html = `<button class="cat-pill ${activeCategory === 'ALL' ? 'active' : ''}" onclick="filterCategory('ALL')">All Categories</button>`;
    
    currentCategories.forEach(cat => {
        const isActive = activeCategory === cat.category_name ? 'active' : '';
        html += `<button class="cat-pill ${isActive}" onclick="filterCategory('${cat.category_name}')">${cat.category_name}</button>`;
    });

    container.innerHTML = html;
}

function filterCategory(catName) {
    activeCategory = catName;
    renderCategoryFilters();
    renderMenuGrid();
}

function renderMenuGrid() {
    const grid = document.getElementById('menuGrid');
    const filtered = activeCategory === 'ALL' 
        ? currentMenu 
        : currentMenu.filter(m => m.category_name === activeCategory);

    if (!filtered.length) {
        grid.innerHTML = '<div class="text-muted">No dishes found in this category.</div>';
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const isInStock = item.stock_status !== 'Out of Stock';
        return `
            <div class="menu-card">
                <div>
                    <div class="menu-card-header">
                        <span class="item-name">${item.item_name}</span>
                        <span class="item-price">₹${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                    <p class="item-desc">${item.description || 'Freshly prepared canteen delicacy.'}</p>
                </div>

                <div>
                    <div class="item-meta">
                        <span>⏱️ ${item.preparation_time_mins || 8} mins</span>
                        <span class="stock-tag ${isInStock ? 'in-stock' : 'out-of-stock'}">
                            ${isInStock ? '● In Stock' : '● Out of Stock'}
                        </span>
                    </div>
                    <button class="btn btn-primary btn-block" 
                        onclick="addToCart(${item.item_id})" 
                        ${!isInStock ? 'disabled' : ''}>
                        ${isInStock ? '➕ Add to Tray' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
}

function addToCart(itemId) {
    const item = currentMenu.find(m => m.item_id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.item_id === itemId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            item_id: item.item_id,
            item_name: item.item_name,
            price: parseFloat(item.price),
            quantity: 1
        });
    }

    updateCartUI();
    toggleCartDrawer();
}

function updateCartQuantity(itemId, delta) {
    const existing = cart.find(c => c.item_id === itemId);
    if (!existing) return;

    existing.quantity += delta;
    if (existing.quantity <= 0) {
        cart = cart.filter(c => c.item_id !== itemId);
    }
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cartCountBadge');
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotalAmount');

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalCount;

    if (!cart.length) {
        list.innerHTML = `<div class="empty-cart-msg">Your tray is empty. Add dishes from the menu!</div>`;
        totalEl.textContent = '₹0.00';
        return;
    }

    let grandTotal = 0;
    list.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        grandTotal += subtotal;
        return `
            <div class="cart-row">
                <div>
                    <div style="font-weight: 600;">${item.item_name}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">₹${item.price.toFixed(2)} each</div>
                </div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateCartQuantity(${item.item_id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${item.item_id}, 1)">+</button>
                    <strong style="margin-left: 0.5rem;">₹${subtotal.toFixed(2)}</strong>
                </div>
            </div>
        `;
    }).join('');

    totalEl.textContent = `₹${grandTotal.toFixed(2)}`;
}

// ------------------------------------------------------------
// 5. PLACE ORDER & ISSUE TOKEN NUMBER
// ------------------------------------------------------------
async function placeOrder() {
    if (!cart.length) return alert('Your tray is empty!');
    if (!currentUser) return alert('Please sign in as a student.');

    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Placing Order & Generating Token...';

    const specialInstructions = document.getElementById('orderInstructions').value;
    const paymentMethod = document.getElementById('paymentMethodSelect').value;

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentUser.student_id,
                items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
                payment_method: paymentMethod,
                special_instructions: specialInstructions
            })
        });

        const data = await res.json();

        if (data.success) {
            showReceiptModal(data);
            cart = [];
            updateCartUI();
            toggleCartDrawer();
            loadStudentTokens();
        } else {
            alert(`⚠️ TRANSACTION FAILED / ROLLED BACK:\n\n${data.error}`);
        }
    } catch (err) {
        alert(`Error placing order: ${err.message}`);
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = '⚡ Place Order & Get Token Number';
    }
}

function showReceiptModal(data) {
    const modal = document.getElementById('receiptModal');
    const body = document.getElementById('receiptModalBody');
    const tokenNo = data.token_no || data.order_id;

    body.innerHTML = `
        <div style="text-align: center;">
            <span class="text-muted" style="font-size:0.9rem;">Your Official Canteen Token:</span>
            <div class="token-stamp">TOKEN #${tokenNo}</div>
            <div class="badge-pill">ORDER CONFIRMED</div>
        </div>
        <div style="background: var(--bg-surface-elevated); padding: 1.2rem; border-radius: var(--radius-md); font-size: 0.88rem; line-height: 1.8; margin-top: 1rem;">
            <div><strong>Order Ref:</strong> <code>${data.transaction_ref}</code></div>
            <div><strong>Amount Paid:</strong> ₹${parseFloat(data.total_amount).toFixed(2)}</div>
            <div><strong>Status:</strong> <span style="color: var(--accent-cyan); font-weight:700;">Transmitted to Kitchen Queue</span></div>
            <div><strong>Kitchen Status:</strong> Sent to Live Display for cooking</div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ------------------------------------------------------------
// 6. STUDENT LIVE TOKEN TRACKER
// ------------------------------------------------------------
async function loadStudentTokens() {
    if (!currentUser || !currentUser.student_id) return;

    try {
        const res = await fetch(`/api/student/tokens/${currentUser.student_id}`);
        const tokens = await res.json();

        const container = document.getElementById('studentTokenCards');
        const countBadge = document.getElementById('activeTokenCount');

        const activeTokens = tokens.filter(t => t.status !== 'Picked Up' && t.status !== 'Cancelled');
        countBadge.textContent = `${activeTokens.length} Active`;

        if (!tokens.length) {
            container.innerHTML = `<div class="empty-tokens-msg">No orders placed yet. Choose delicious dishes below to receive your Token!</div>`;
            return;
        }

        container.innerHTML = tokens.map(t => {
            const isReady = t.status === 'Ready';
            const isCompleted = t.status === 'Picked Up';
            const tokenNo = t.token_no || t.order_id;

            return `
                <div class="token-card ${isReady ? 'ready' : ''}">
                    <div class="token-card-top">
                        <div class="token-no-badge">
                            <span>🎫</span> TOKEN #${tokenNo}
                        </div>
                        <div class="token-status-pill ${t.status.toLowerCase().replace(/\s+/g, '-')}">
                            ${t.status === 'Ready' ? '🎉 READY FOR PICKUP' : t.status.toUpperCase()}
                        </div>
                    </div>

                    <div style="font-size:0.85rem; color: var(--text-secondary);">
                        <strong>Dishes:</strong> ${t.item_summary || 'Order Items'}
                        ${t.special_instructions ? `<div style="color: var(--accent-amber); margin-top:0.2rem;">Note: "${t.special_instructions}"</div>` : ''}
                    </div>

                    <!-- Progress Stepper -->
                    <div class="token-stepper">
                        ${renderStepItem('Placed', t.status, 1)}
                        ${renderStepItem('Preparing', t.status, 2)}
                        ${renderStepItem('Ready', t.status, 3)}
                        ${renderStepItem('Picked Up', t.status, 4)}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                        <span class="text-muted">Total: ₹${parseFloat(t.total_amount).toFixed(2)}</span>
                        ${isCompleted ? `
                            <button class="btn btn-outline btn-sm" onclick="promptFeedback(${t.order_id})">
                                ⭐ Rate Meal
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.warn('Error loading tokens:', e);
    }
}

function renderStepItem(stepName, currentStatus, stepIndex) {
    const statusOrder = { 'Placed': 1, 'Preparing': 2, 'Ready': 3, 'Picked Up': 4 };
    const currentOrder = statusOrder[currentStatus] || 1;
    const isCompleted = currentOrder > stepIndex;
    const isActive = currentOrder === stepIndex;

    let cls = '';
    if (isCompleted) cls = 'completed';
    else if (isActive) cls = 'active';

    return `
        <div class="step-item ${cls}">
            <div class="step-bubble">${isCompleted ? '✓' : stepIndex}</div>
            <span class="step-label">${stepName}</span>
        </div>
    `;
}

// ------------------------------------------------------------
// 7. KITCHEN PORTAL: LIVE QUEUE (KDS BY TOKEN NUMBER)
// ------------------------------------------------------------
function switchKitchenTab(tabId) {
    document.querySelectorAll('.k-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ktab === tabId);
    });
    document.querySelectorAll('.kitchen-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'kdsTab') loadKitchenQueue();
    if (tabId === 'inventoryTab') loadInventory();
    if (tabId === 'analyticsTab') loadAnalytics();
}

async function loadKitchenQueue() {
    try {
        const res = await fetch('/api/orders/active');
        const orders = await res.json();

        const placedList = document.getElementById('placedList');
        const prepList = document.getElementById('preparingList');
        const readyList = document.getElementById('readyList');

        const placed = orders.filter(o => o.status === 'Placed');
        const prep = orders.filter(o => o.status === 'Preparing');
        const ready = orders.filter(o => o.status === 'Ready');

        document.getElementById('placedCount').textContent = placed.length;
        document.getElementById('prepCount').textContent = prep.length;
        document.getElementById('readyCount').textContent = ready.length;
        document.getElementById('kitchenOrderCountBadge').textContent = orders.length;

        placedList.innerHTML = placed.map(o => renderKitchenTicket(o, 'Start Preparing 🍳', 'Preparing')).join('') 
            || renderKdsEmptyState('🔔', 'No Placed Orders', 'New student orders will appear here automatically.');
        prepList.innerHTML = prep.map(o => renderKitchenTicket(o, 'Mark Ready ✅', 'Ready')).join('') 
            || renderKdsEmptyState('🍳', 'Kitchen Counter Clear', 'Move orders here when chefs start preparation.');
        readyList.innerHTML = ready.map(o => renderKitchenTicket(o, 'Handover / Picked Up 🤝', 'Picked Up')).join('') 
            || renderKdsEmptyState('✨', 'Pickup Counter Empty', 'Completed dishes ready for student pickup appear here.');
    } catch (e) {
        console.warn('Kitchen queue refresh notice:', e);
    }
}

function renderKdsEmptyState(icon, title, desc) {
    return `
        <div class="kds-empty-card">
            <span class="kds-empty-icon">${icon}</span>
            <div class="kds-empty-title">${title}</div>
            <p class="kds-empty-desc">${desc}</p>
        </div>
    `;
}

function renderKitchenTicket(o, btnText, nextStatus) {
    const itemsSummary = o.item_summary || (o.items ? o.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ') : 'Order details');
    const tokenNo = o.order_id;

    return `
        <div class="order-ticket">
            <div class="ticket-header">
                <span class="ticket-id">TOKEN #${tokenNo}</span>
                <span class="ticket-student">${o.student_name || 'Student'} (${o.reg_no || ''})</span>
            </div>
            <div class="ticket-items">
                <strong>Items:</strong> ${itemsSummary}
            </div>
            ${o.special_instructions ? `<div class="ticket-instructions">⚠️ Note: "${o.special_instructions}"</div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.8rem;">
                <strong>₹${parseFloat(o.total_amount).toFixed(2)}</strong>
                <button class="btn btn-outline btn-sm" onclick="advanceOrderStatus(${o.order_id}, '${nextStatus}')">
                    ${btnText}
                </button>
            </div>
        </div>
    `;
}

async function advanceOrderStatus(orderId, nextStatus) {
    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        const data = await res.json();
        if (data.success) {
            loadKitchenQueue();
        }
    } catch (err) {
        alert(`Failed to update status: ${err.message}`);
    }
}

// ------------------------------------------------------------
// 8. INVENTORY & RECIPE BOM (UNIT 4)
// ------------------------------------------------------------
async function loadInventory() {
    try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        const ingredients = data.ingredients || [];
        const alerts = data.alerts || [];

        const banner = document.getElementById('lowStockBanner');
        const badge = document.getElementById('kitchenLowStockBadge');

        if (alerts.length > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = alerts.length;
            banner.style.display = 'flex';
            document.getElementById('lowStockDetails').textContent = 
                `${alerts.length} item(s) running low: ${alerts.map(a => a.ingredient_name).join(', ')}`;
        } else {
            badge.style.display = 'none';
            banner.style.display = 'none';
        }

        const grid = document.getElementById('inventoryGrid');
        grid.innerHTML = ingredients.map(ing => {
            const current = parseFloat(ing.current_stock);
            const threshold = parseFloat(ing.min_threshold);
            const maxCap = Math.max(threshold * 3, current);
            const pct = Math.min(100, Math.round((current / maxCap) * 100));

            let statusClass = '';
            if (current <= threshold * 0.25) statusClass = 'critical';
            else if (current <= threshold) statusClass = 'warning';

            return `
                <div class="ingredient-card">
                    <div class="ing-header">
                        <span class="ing-name">${ing.ingredient_name}</span>
                        <span class="stock-tag ${current <= threshold ? 'out-of-stock' : 'in-stock'}">
                            ${current <= threshold ? '⚠️ LOW STOCK' : '● OK'}
                        </span>
                    </div>
                    <div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill ${statusClass}" style="width: ${pct}%"></div>
                        </div>
                        <div class="ing-meta">
                            <span>Stock: <strong>${current.toFixed(1)} ${ing.unit}</strong></span>
                            <span>Min: ${threshold.toFixed(0)} ${ing.unit}</span>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; display:flex; justify-content:flex-end;">
                        <button class="btn btn-outline btn-sm" onclick="quickRestockPrompt(${ing.ingredient_id}, '${ing.ingredient_name}', '${ing.unit}')">
                            ➕ Restock
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const select = document.getElementById('restockSelect');
        select.innerHTML = ingredients.map(i => `<option value="${i.ingredient_id}">${i.ingredient_name} (${i.unit})</option>`).join('');
    } catch (e) {
        console.error('Inventory error:', e);
    }
}

function openRestockModal() {
    document.getElementById('restockModal').style.display = 'flex';
}

function closeRestockModal() {
    document.getElementById('restockModal').style.display = 'none';
}

function quickRestockPrompt(id, name, unit) {
    const qty = prompt(`Enter restock quantity for ${name} (${unit}):`, '2000');
    if (qty && parseFloat(qty) > 0) {
        performRestock(id, parseFloat(qty));
    }
}

async function submitRestock() {
    const id = document.getElementById('restockSelect').value;
    const qty = document.getElementById('restockQuantity').value;
    if (!qty || parseFloat(qty) <= 0) return alert('Enter valid quantity');
    await performRestock(id, parseFloat(qty));
    closeRestockModal();
}

async function performRestock(id, quantity) {
    try {
        const res = await fetch('/api/inventory/restock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredient_id: id, quantity })
        });
        const data = await res.json();
        if (data.success) {
            loadInventory();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert(err.message);
    }
}

// ------------------------------------------------------------
// 9. UNIT 5 ACID TRANSACTION & ROLLBACK SIMULATOR
// ------------------------------------------------------------
async function runAcidSimulation(scenario) {
    const consoleEl = document.getElementById('acidLogConsole');
    const badge = document.getElementById('acidFinalBadge');

    badge.className = 'terminal-badge';
    badge.textContent = 'EXECUTING TRANSACTION...';
    consoleEl.innerHTML = '<div class="log-line text-muted">Initiating transaction with InnoDB engine...</div>';

    try {
        const res = await fetch('/api/demo/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario, item_id: 1, quantity: 2 })
        });
        const data = await res.json();

        consoleEl.innerHTML = '';
        for (let i = 0; i < data.logs.length; i++) {
            const log = data.logs[i];
            await new Promise(r => setTimeout(r, 220));

            const line = document.createElement('div');
            line.className = 'log-line';
            line.innerHTML = `
                <span class="log-step">[Step ${log.step}]</span>
                <div>
                    <span class="log-sql">${log.action}</span>
                    <div class="log-note">${log.note}</div>
                </div>
            `;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        if (data.success) {
            badge.className = 'terminal-badge' + (scenario === 'commit' ? ' tag-success' : ' tag-warning');
            badge.textContent = `${data.acidProperty} (STATE: ${data.finalState.toUpperCase()})`;
        } else {
            badge.className = 'terminal-badge tag-danger';
            badge.textContent = `ROLLBACK EXECUTED (STATE: ${data.finalState.toUpperCase()})`;
        }

        loadInventory();
        loadAnalytics();
    } catch (err) {
        consoleEl.innerHTML += `<div class="log-line" style="color:red;">Error: ${err.message}</div>`;
    }
}

// ------------------------------------------------------------
// 10. SALES ANALYTICS (UNIT 2)
// ------------------------------------------------------------
async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics');
        const data = await res.json();

        document.getElementById('kpiRevenue').textContent = `₹${parseFloat(data.summary.gross_sales || 0).toFixed(2)}`;
        document.getElementById('kpiOrders').textContent = data.summary.total_orders || 0;
        document.getElementById('kpiRushHour').textContent = data.peakHour || '12:00 - 13:00';
        document.getElementById('kpiRating').textContent = `⭐ ${data.rating.avg_rating || 4.5}`;
        document.getElementById('kpiRatingCount').textContent = `Based on ${data.rating.count || 0} reviews`;

        const topList = document.getElementById('topItemsList');
        if (data.topItems && data.topItems.length) {
            topList.innerHTML = data.topItems.map((item, idx) => `
                <div class="leader-item">
                    <div>
                        <strong style="color: var(--accent-cyan); margin-right: 0.5rem;">#${idx + 1}</strong>
                        <span>${item.name || item.item_name}</span>
                        <div class="text-muted" style="font-size:0.75rem;">${item.category_name || 'Canteen Special'}</div>
                    </div>
                    <div>
                        <strong>${item.units || item.units_sold} units</strong>
                        <span class="text-muted" style="margin-left: 0.5rem; font-size:0.8rem;">(₹${parseFloat(item.revenue).toFixed(0)})</span>
                    </div>
                </div>
            `).join('');
        }

        const alertsList = document.getElementById('analyticsAlertsList');
        const invRes = await fetch('/api/inventory');
        const invData = await invRes.json();
        const alerts = invData.alerts || [];

        if (alerts.length) {
            alertsList.innerHTML = alerts.map(a => `
                <div class="leader-item" style="border-left: 3px solid var(--accent-rose);">
                    <div>
                        <strong>${a.ingredient_name}</strong>
                        <div class="text-muted" style="font-size:0.75rem;">Deficit: ${a.deficit_amount} ${a.unit}</div>
                    </div>
                    <span class="badge danger">${a.urgency_level}</span>
                </div>
            `).join('');
        } else {
            alertsList.innerHTML = '<div class="text-muted" style="color: var(--accent-emerald);">All raw ingredients comfortably above reorder thresholds!</div>';
        }
    } catch (e) {
        console.error('Analytics load error:', e);
    }
}

// ------------------------------------------------------------
// 11. FEEDBACK
// ------------------------------------------------------------
function promptFeedback(orderId) {
    document.getElementById('feedbackOrderId').value = orderId;
    setStar(5);
    document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').style.display = 'none';
}

function setStar(starCount) {
    selectedStarRating = starCount;
    document.querySelectorAll('#starContainer .star').forEach((s, idx) => {
        s.classList.toggle('active', idx < starCount);
    });
}

async function submitFeedback() {
    const orderId = document.getElementById('feedbackOrderId').value;
    const comments = document.getElementById('feedbackComment').value;

    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                student_id: currentUser ? currentUser.student_id : 1,
                rating: selectedStarRating,
                comments
            })
        });
        closeFeedbackModal();
        alert('Thank you for rating your meal!');
    } catch (err) {
        alert(err.message);
    }
}
