document.addEventListener('DOMContentLoaded', () => {

    // ==== MOCK DATA & API ====
    const mockApis = {
        '/api/products': [
            { id: 1, name: 'Quantum Processors', qty: 15, loc: 'Warehouse A', status: 'Low' },
            { id: 2, name: 'Industrial Robotics Arm', qty: 140, loc: 'Warehouse C', status: 'High' },
            { id: 3, name: 'Thermal Sensors', qty: 45, loc: 'Warehouse B', status: 'Medium' },
            { id: 4, name: 'Lithium Battery Packs', qty: 5, loc: 'Warehouse A', status: 'Low' },
            { id: 5, name: 'Drone Components', qty: 250, loc: 'Warehouse C', status: 'High' }
        ],
        '/api/orders': [
            { id: 'ORD-8492', product: 'Thermal Sensors', status: 'Pending', progress: 20 },
            { id: 'ORD-8493', product: 'Lithium Battery Packs', status: 'Shipped', progress: 60 },
            { id: 'ORD-8494', product: 'Quantum Processors', status: 'Delivered', progress: 100 },
            { id: 'ORD-8495', product: 'Industrial Robotics Arm', status: 'Pending', progress: 10 }
        ],
        '/api/kpi': {
            totalOrders: 1248,
            revenue: '$342,500',
            lowStock: 12,
            delayed: 3
        },
        '/api/notifications': [
            { title: 'Weather Alert', desc: 'Storm warning affecting Warehouse B transit routes.', type: 'alert' },
            { title: 'Stock Replenished', desc: 'Received 500 units of Drone Components.', type: 'success' },
            { title: 'Rush Order', desc: 'ORD-8493 has been expedited.', type: 'info' }
        ]
    };

    // Simulated fetch function
    const mockFetch = (url) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    json: () => Promise.resolve(mockApis[url] || [])
                });
            }, 400); // simulate network delay
        });
    };

    // ==== UI STATE & NAVIGATION ====
    const loginPage = document.getElementById('login-page');
    const appLayout = document.getElementById('app-layout');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const viewSections = document.querySelectorAll('.view-section:not(#login-page)');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Login Logic
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const pwd = document.getElementById('password').value;

        if (email && pwd) {
            loginPage.classList.remove('active');
            setTimeout(() => {
                loginPage.classList.add('hidden');
                appLayout.classList.remove('hidden');
                document.getElementById('dashboard-page').classList.add('active');
                initDashboard();
                showToast('Welcome back, Admin!');
            }, 300);
        } else {
            loginError.textContent = 'Invalid credentials.';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        appLayout.classList.add('hidden');
        viewSections.forEach(s => s.classList.remove('active'));
        loginPage.classList.remove('hidden');
        setTimeout(() => loginPage.classList.add('active'), 50);
        document.getElementById('password').value = '';
    });

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Update active link
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Update title
            document.querySelector('.nav-title').textContent = item.textContent.trim();

            // Toggle view
            const targetId = item.getAttribute('data-target');
            viewSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Close mobile sidebar
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }

            // Initialize specific page logic
            if (targetId === 'inventory-page') loadInventory();
            if (targetId === 'orders-page') loadOrders();
            if (targetId === 'analytics-page') initAnalyticsCharts();
        });
    });

    // Mobile Menu
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Toast Notification
    const showToast = (message) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // ==== DASHBOARD LOGIC ====
    let overviewChartInstance = null;

    async function initDashboard() {
        // Fetch KPIs
        const kpiRes = await mockFetch('/api/kpi');
        const kpis = await kpiRes.json();
        document.getElementById('kpi-total-orders').textContent = kpis.totalOrders;
        document.getElementById('kpi-revenue').textContent = kpis.revenue;
        document.getElementById('kpi-low-stock').textContent = kpis.lowStock;
        document.getElementById('kpi-delayed').textContent = kpis.delayed;

        // Fetch Notifications
        const notifRes = await mockFetch('/api/notifications');
        const notifs = await notifRes.json();
        const notifList = document.getElementById('notification-list');
        notifList.innerHTML = notifs.map(n => `
            <li class="notification-item ${n.type}">
                <div class="notif-content">
                    <h4>${n.title}</h4>
                    <p>${n.desc}</p>
                </div>
            </li>
        `).join('');

        // Init Overview Chart
        if (!overviewChartInstance) {
            const ctx = document.getElementById('overviewChart').getContext('2d');
            overviewChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Orders',
                        data: [120, 190, 150, 220, 180, 250, 210],
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    }


    // ==== INVENTORY LOGIC ====
    const inventoryTableBody = document.querySelector('#inventory-table tbody');
    const addProductBtn = document.getElementById('add-product-btn');
    const addProductCatainer = document.getElementById('add-product-container');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    const addProductForm = document.getElementById('add-product-form');

    let currentProducts = [];

    async function loadInventory() {
        if (currentProducts.length === 0) {
            const res = await mockFetch('/api/products');
            currentProducts = await res.json();
        }
        renderInventory();
    }

    function renderInventory() {
        inventoryTableBody.innerHTML = currentProducts.map(p => {
            const bgStyle = p.status === 'Low' ? 'style="background-color: var(--danger-bg);"' : '';
            return `
            <tr ${bgStyle}>
                <td><strong>${p.name}</strong></td>
                <td>${p.qty}</td>
                <td>${p.loc}</td>
                <td><span class="badge status-${p.status.toLowerCase()}">${p.status}</span></td>
                <td>
                    <button class="btn-action edit" onclick="editProduct(${p.id})" title="Edit"><span class="material-icons">edit</span></button>
                    <button class="btn-action delete" onclick="deleteProduct(${p.id})" title="Delete"><span class="material-icons">delete</span></button>
                </td>
            </tr>
        `}).join('');
    }

    window.editProduct = (id) => {
        showToast('Editing capability mock! ID: ' + id);
    };

    window.deleteProduct = (id) => {
        if (confirm('Are you sure you want to delete this product?')) {
            currentProducts = currentProducts.filter(p => p.id !== id);
            renderInventory();
            showToast('Product deleted successfully');
        }
    };

    addProductBtn.addEventListener('click', () => {
        addProductCatainer.classList.remove('hidden');
    });

    cancelAddBtn.addEventListener('click', () => {
        addProductCatainer.classList.add('hidden');
        addProductForm.reset();
    });

    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-product-name').value;
        const qty = parseInt(document.getElementById('new-product-qty').value);
        const loc = document.getElementById('new-product-loc').value;

        let status = 'Medium';
        if (qty < 20) status = 'Low';
        if (qty > 100) status = 'High';

        currentProducts.push({
            id: Date.now(),
            name, qty, loc, status
        });

        renderInventory();
        addProductCatainer.classList.add('hidden');
        addProductForm.reset();
        showToast('Product added successfully');
    });


    // ==== ORDERS LOGIC ====
    const ordersTableBody = document.querySelector('#orders-table tbody');
    async function loadOrders() {
        const res = await mockFetch('/api/orders');
        const orders = await res.json();

        ordersTableBody.innerHTML = orders.map(o => {
            let pColor = '';
            if (o.status === 'Delivered') pColor = 'var(--success)';
            else if (o.status === 'Shipped') pColor = 'var(--info)';
            else pColor = 'var(--warning)';

            return `
            <tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.product}</td>
                <td><span class="badge status-${o.status.toLowerCase()}">${o.status}</span></td>
                <td>
                    <div class="timeline">
                        <div class="timeline-fill" style="width: ${o.progress}%; background: ${pColor};"></div>
                    </div>
                </td>
                <td>
                    <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
            </tr>
        `}).join('');
    }

    window.updateOrderStatus = (id, newStatus) => {
        showToast(`Order ${id} marked as ${newStatus}`);
    };

    // ==== ANALYTICS LOGIC ====
    let forecastChartInstance = null;
    let perfChartInstance = null;

    function initAnalyticsCharts() {
        if (!forecastChartInstance) {
            const ctx1 = document.getElementById('forecastChart').getContext('2d');
            forecastChartInstance = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    datasets: [{
                        label: 'Predicted Demand',
                        data: [1500, 1800, 1650, 2100, 2400, 2200],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderDash: [5, 5],
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        if (!perfChartInstance) {
            const ctx2 = document.getElementById('performanceChart').getContext('2d');
            perfChartInstance = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Robotics', 'Sensors', 'Processors', 'Batteries', 'Drones'],
                    datasets: [{
                        label: 'Units Sold (YTD)',
                        data: [420, 850, 930, 1100, 310],
                        backgroundColor: '#3B82F6',
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

});
