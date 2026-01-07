document.addEventListener('DOMContentLoaded', () => {
    const qs = s => document.querySelector(s);
    const qsa = s => document.querySelectorAll(s);
    const fmt = n => n.toLocaleString('vi-VN') + ' VND';

    let state = {
        user: null,
        products: [],
        orders: [],
        users: [],
        revenue: { daily: {}, monthly: {}, yearly: {} },
        stats: {},
        charts: {},
        currentPage: 'dashboard',
        filters: {
            search: '',
            category: '',
            status: '',
            date: '',
            role: ''
        }
    };

    // --- AUTH & INIT ---
    async function checkAuth() {
        try {
            showLoading();
            const res = await fetch('/api/me', { credentials: 'include' });
            if (!res.ok) throw new Error('Not authenticated');
            const data = await res.json();
            if (!data.user || data.user.role !== 'admin') {
                window.location.href = '/';
                return;
            }
            state.user = data.user;
            qs('#adminName').textContent = state.user.name;
            await initializeAdminPanel();
            hideLoading();
        } catch (error) {
            hideLoading();
            window.location.href = '/';
        }
    }

    async function initializeAdminPanel() {
        try {
        await Promise.all([
            loadProducts(),
                loadOrders(),
                loadUsers(),
            loadRevenueStats(),
            loadDashboardStats(),
        ]);
        renderDashboard();
        renderProductsTable();
            renderOrdersTable();
            renderUsersTable();
        setupEventListeners();
            setupMobileMenu();
        } catch (error) {
            console.error('Initialization error:', error);
            showNotification('Có lỗi xảy ra khi khởi tạo', 'error');
        }
    }

    async function doLogout() {
        try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/';
        } catch (error) {
            showNotification('Lỗi khi đăng xuất', 'error');
        }
    }

    // --- DATA LOADING ---
    async function loadProducts() {
        const res = await fetch('/api/products');
        const data = await res.json();
        state.products = data.products || [];
    }

    async function loadOrders() {
        const res = await fetch('/api/orders', { credentials: 'include' });
        const data = await res.json();
        state.orders = data.orders || [];
    }

    async function loadUsers() {
        const res = await fetch('/api/users', { credentials: 'include' });
        const data = await res.json();
        state.users = data.users || [];
    }

    async function loadRevenueStats() {
        const res = await fetch('/api/revenue-stats', { credentials: 'include' });
        state.revenue = await res.json();
    }

    async function loadDashboardStats() {
        const res = await fetch('/api/admin/data', { credentials: 'include' });
        state.stats = await res.json();
    }

    // --- RENDERING ---
    function renderDashboard() {
        // Update stats
        qs('#totalRevenue').textContent = fmt(state.stats.totalRevenue || 0);
        qs('#totalOrders').textContent = state.stats.orderCount || 0;
        qs('#totalProducts').textContent = state.stats.productCount || 0;
        qs('#totalUsers').textContent = state.stats.userCount || 0;

        // Update change indicators (mock data for now)
        qs('#revenueChange').textContent = '+12.5%';
        qs('#ordersChange').textContent = '+8.2%';
        qs('#productsChange').textContent = '0%';
        qs('#usersChange').textContent = '+15.3%';

        // Render recent orders
        renderRecentOrders();
        
        // Render chart
        renderChart('daily');
    }

    function renderRecentOrders() {
        const recentOrders = state.orders.slice(0, 5);
        const container = qs('#recentOrdersList');
        
        if (recentOrders.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Chưa có đơn hàng nào</p>';
            return;
        }

        container.innerHTML = recentOrders.map(order => `
            <div class="order-item">
                <div class="order-info">
                    <h4>#${order.id}</h4>
                    <p>${order.customerName || 'Khách vãng lai'}</p>
                </div>
                <div class="order-status ${order.status}">${getStatusText(order.status)}</div>
            </div>
        `).join('');
    }

    function renderProductsTable() {
        const filteredProducts = filterProducts();
        const tbody = qs('#productsTableBody');
        
        if (filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Không có sản phẩm nào</td></tr>';
            return;
        }

        tbody.innerHTML = filteredProducts.map(p => `
            <tr data-id="${p.id}">
                <td><img src="${p.image}" alt="${p.name}" class="product-img"></td>
                <td>
                    <div>
                        <strong>${p.name}</strong>
                        ${p.description ? `<br><small class="text-muted">${p.description}</small>` : ''}
                    </div>
                </td>
                <td><span class="chip small">${p.category}</span></td>
                <td><strong>${fmt(p.price)}</strong></td>
                <td>
                    <span class="order-status ${p.status || 'active'}">${getStatusText(p.status || 'active')}</span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn ghost small btn-edit" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn ghost small btn-delete" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners
        qsa('.btn-edit').forEach(btn => btn.addEventListener('click', handleEditProduct));
        qsa('.btn-delete').forEach(btn => btn.addEventListener('click', handleDeleteProduct));
    }

    function renderOrdersTable() {
        const filteredOrders = filterOrders();
        const tbody = qs('#ordersTableBody');
        
        if (filteredOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không có đơn hàng nào</td></tr>';
            return;
        }

        tbody.innerHTML = filteredOrders.map(order => `
            <tr data-id="${order.id}">
                <td><strong>#${order.id}</strong></td>
                <td>${order.customerName || 'Khách vãng lai'}</td>
                <td>${order.items?.length || 0} sản phẩm</td>
                <td><strong>${fmt(order.total || 0)}</strong></td>
                <td>
                    <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                </td>
                <td>${formatDate(order.createdAt)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn ghost small btn-view-order" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn ghost small btn-update-status" title="Cập nhật trạng thái">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners
        qsa('.btn-view-order').forEach(btn => btn.addEventListener('click', handleViewOrder));
        qsa('.btn-update-status').forEach(btn => btn.addEventListener('click', handleUpdateOrderStatus));
    }

    function renderUsersTable() {
        const filteredUsers = filterUsers();
        const tbody = qs('#usersTableBody');
        
        if (filteredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không có người dùng nào</td></tr>';
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => `
            <tr data-id="${user.id}">
                <td>
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                </td>
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>
                    <span class="chip small ${user.role}">${getRoleText(user.role)}</span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn ghost small btn-edit-user" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn ghost small btn-delete-user" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners
        qsa('.btn-edit-user').forEach(btn => btn.addEventListener('click', handleEditUser));
        qsa('.btn-delete-user').forEach(btn => btn.addEventListener('click', handleDeleteUser));
    }

    function renderChart(timeframe) {
        const ctx = qs('#revenueChart').getContext('2d');
        const data = state.revenue[timeframe] || {};
        
        const sortedLabels = Object.keys(data).sort();
        const chartData = sortedLabels.map(label => data[label]);

        if (state.charts.revenue) {
            state.charts.revenue.destroy();
        }

        state.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedLabels,
                datasets: [{
                    label: 'Doanh thu',
                    data: chartData,
                    backgroundColor: [
                        'rgba(229, 9, 20, 0.8)',
                        'rgba(255, 107, 111, 0.8)',
                        'rgba(229, 9, 20, 0.6)',
                        'rgba(255, 107, 111, 0.6)',
                        'rgba(229, 9, 20, 0.4)',
                        'rgba(255, 107, 111, 0.4)',
                        'rgba(229, 9, 20, 0.2)'
                    ],
                    borderColor: [
                        'rgba(229, 9, 20, 1)',
                        'rgba(255, 107, 111, 1)',
                        'rgba(229, 9, 20, 0.8)',
                        'rgba(255, 107, 111, 0.8)',
                        'rgba(229, 9, 20, 0.6)',
                        'rgba(255, 107, 111, 0.6)',
                        'rgba(229, 9, 20, 0.4)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#e50914',
                        borderWidth: 2,
                        cornerRadius: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)',
                            drawBorder: false
                        },
                        ticks: { 
                            callback: value => fmt(value),
                            color: '#6b7280',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // --- FILTERING ---
    function filterProducts() {
        return state.products.filter(product => {
            const matchesSearch = !state.filters.search || 
                product.name.toLowerCase().includes(state.filters.search.toLowerCase()) ||
                product.category.toLowerCase().includes(state.filters.search.toLowerCase());
            const matchesCategory = !state.filters.category || product.category === state.filters.category;
            return matchesSearch && matchesCategory;
        });
    }

    function filterOrders() {
        return state.orders.filter(order => {
            const matchesSearch = !state.filters.search || 
                order.id.toString().includes(state.filters.search) ||
                (order.customerName && order.customerName.toLowerCase().includes(state.filters.search.toLowerCase()));
            const matchesStatus = !state.filters.status || order.status === state.filters.status;
            const matchesDate = !state.filters.date || 
                new Date(order.createdAt).toDateString() === new Date(state.filters.date).toDateString();
            return matchesSearch && matchesStatus && matchesDate;
        });
    }

    function filterUsers() {
        return state.users.filter(user => {
            const matchesSearch = !state.filters.search || 
                user.name.toLowerCase().includes(state.filters.search.toLowerCase()) ||
                user.email.toLowerCase().includes(state.filters.search.toLowerCase());
            const matchesRole = !state.filters.role || user.role === state.filters.role;
            return matchesSearch && matchesRole;
        });
    }

    // --- UTILITY FUNCTIONS ---
    function getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'processing': 'Đang xử lý',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy',
            'active': 'Hoạt động',
            'inactive': 'Tạm ngưng'
        };
        return statusMap[status] || status;
    }

    function getRoleText(role) {
        const roleMap = {
            'admin': 'Quản trị viên',
            'staff': 'Nhân viên',
            'user': 'Người dùng'
        };
        return roleMap[role] || role;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showLoading() {
        qs('#loadingOverlay').classList.remove('hidden');
    }

    function hideLoading() {
        qs('#loadingOverlay').classList.add('hidden');
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 15px rgba(0,0,0,0.1);
            z-index: 4000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // --- EVENT HANDLERS ---
    function setupEventListeners() {
        // Logout
        qs('#btnLogout').addEventListener('click', doLogout);

        // Page navigation
        qsa('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const page = item.dataset.page;
                    navigateToPage(page);
                }
            });
        });

        // Chart timeframe
        qsa('.chart-toolbar .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                qsa('.chart-toolbar .chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                renderChart(chip.dataset.timeframe);
            });
        });

        // Product Modal
        qs('#btnAddProduct').addEventListener('click', openProductModal);
        qs('#closeModal').addEventListener('click', closeProductModal);
        qs('#cancelProduct').addEventListener('click', closeProductModal);
        qs('#productForm').addEventListener('submit', handleSaveProduct);
        
        // Image upload
        qs('#productImage').addEventListener('change', handleImageUpload);
        
        // Drag and drop for image
        const imageContainer = qs('.image-preview-container');
        imageContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageContainer.classList.add('dragover');
        });
        
        imageContainer.addEventListener('dragleave', () => {
            imageContainer.classList.remove('dragover');
        });
        
        imageContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            imageContainer.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                qs('#productImage').files = files;
                handleImageUpload({ target: { files: files } });
            }
        });

        // Search and filters
        qs('#productSearch')?.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            renderProductsTable();
        });

        qs('#categoryFilter')?.addEventListener('change', (e) => {
            state.filters.category = e.target.value;
            renderProductsTable();
        });

        qs('#orderSearch')?.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            renderOrdersTable();
        });

        qs('#statusFilter')?.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            renderOrdersTable();
        });

        qs('#userSearch')?.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            renderUsersTable();
        });

        qs('#roleFilter')?.addEventListener('change', (e) => {
            state.filters.role = e.target.value;
            renderUsersTable();
        });

        // Refresh buttons
        qs('#refreshDashboard')?.addEventListener('click', async () => {
            showLoading();
            await Promise.all([loadDashboardStats(), loadOrders()]);
            renderDashboard();
            hideLoading();
            showNotification('Đã cập nhật dữ liệu', 'success');
        });

        qs('#refreshOrders')?.addEventListener('click', async () => {
            showLoading();
            await loadOrders();
            renderOrdersTable();
            hideLoading();
            showNotification('Đã cập nhật danh sách đơn hàng', 'success');
        });

        qs('#refreshUsers')?.addEventListener('click', async () => {
            showLoading();
            await loadUsers();
            renderUsersTable();
            hideLoading();
            showNotification('Đã cập nhật danh sách người dùng', 'success');
        });

        // Modal close on outside click
        qsa('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    function setupMobileMenu() {
        // Create mobile menu toggle button
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-menu-toggle';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileToggle.addEventListener('click', () => {
            qs('.sidebar').classList.toggle('open');
        });
        document.body.appendChild(mobileToggle);

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = qs('.sidebar');
                const mobileToggle = qs('.mobile-menu-toggle');
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    function navigateToPage(page) {
        // Hide all pages
        qsa('.page').forEach(p => p.classList.add('hidden'));
        
        // Show target page
        qs(`#${page}Page`).classList.remove('hidden');
        
        // Update navigation
        qsa('.nav-item').forEach(i => i.classList.remove('active'));
        qs(`[data-page="${page}"]`).classList.add('active');
        
        state.currentPage = page;
        
        // Close mobile menu
        if (window.innerWidth <= 768) {
            qs('.sidebar').classList.remove('open');
        }
    }

    // --- PRODUCT HANDLERS ---
    function openProductModal(product = null) {
        const form = qs('#productForm');
        if (form) {
            form.reset();
        }
        
        const imagePreview = qs('#imagePreview');
        if (imagePreview) {
            imagePreview.classList.add('hidden');
            imagePreview.src = '';
        }
        
        const productImage = qs('#productImage');
        if (productImage) {
            productImage.value = '';
        }

        if (product) {
            const modalTitle = qs('#modalTitle');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-edit"></i> Sửa Sản phẩm';
            }
            qs('#productId').value = product.id || '';
            qs('#productName').value = product.name || '';
            qs('#productCategory').value = product.category || '';
            qs('#productPrice').value = product.price || '';
            qs('#productStatus').value = product.status || 'active';
            qs('#productDescription').value = product.description || '';
            if (product.image && imagePreview) {
                imagePreview.src = product.image;
                imagePreview.classList.remove('hidden');
            }
        } else {
            const modalTitle = qs('#modalTitle');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Thêm Sản phẩm Mới';
            }
            qs('#productId').value = '';
            qs('#productName').value = '';
            qs('#productCategory').value = '';
            qs('#productPrice').value = '';
            qs('#productStatus').value = 'active';
            qs('#productDescription').value = '';
        }
        qs('#productModal').classList.remove('hidden');
    }

    function closeProductModal() {
        qs('#productModal').classList.add('hidden');
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                qs('#imagePreview').src = event.target.result;
                qs('#imagePreview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    function handleEditProduct(e) {
        const productId = e.target.closest('tr').dataset.id;
        const product = state.products.find(p => p.id === productId);
        if (product) {
            openProductModal(product);
        }
    }

    async function handleDeleteProduct(e) {
        const productId = e.target.closest('tr').dataset.id;
        const product = state.products.find(p => p.id === productId);
        
        if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product?.name}"?`)) {
            try {
                showLoading();
                const res = await fetch(`/api/products/${productId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Xóa thất bại');
                
                await loadProducts();
                renderProductsTable();
                await loadDashboardStats();
                qs('#totalProducts').textContent = state.stats.productCount || 0;
                hideLoading();
                showNotification('Đã xóa sản phẩm thành công', 'success');

            } catch (error) {
                hideLoading();
                showNotification(error.message, 'error');
            }
        }
    }

    async function handleSaveProduct(e) {
        e.preventDefault();
        const id = qs('#productId').value;
        const name = qs('#productName').value.trim();
        const category = qs('#productCategory').value.trim();
        const price = qs('#productPrice').value.trim();
        const status = qs('#productStatus').value || 'active';
        const description = qs('#productDescription').value.trim() || '';

        // Validate
        if (!name) {
            showNotification('Vui lòng nhập tên sản phẩm', 'error');
            return;
        }
        if (!category) {
            showNotification('Vui lòng chọn danh mục', 'error');
            return;
        }
        if (!price || isNaN(price) || parseInt(price) <= 0) {
            showNotification('Vui lòng nhập giá hợp lệ', 'error');
            return;
        }

        const url = id ? `/api/products/${id}` : '/api/products';
        const method = id ? 'PUT' : 'POST';

        const payload = {
            name,
            category,
            price: parseInt(price),
            status,
            description
        };

        try {
            showLoading();
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Lưu thất bại');
            }

            closeProductModal();
            await loadProducts();
            renderProductsTable();
            await loadDashboardStats();
            qs('#totalProducts').textContent = state.stats.productCount || 0;
            hideLoading();
            showNotification(id ? 'Đã cập nhật sản phẩm thành công' : 'Đã thêm sản phẩm mới thành công', 'success');

        } catch (error) {
            hideLoading();
            showNotification(error.message || 'Có lỗi xảy ra khi lưu sản phẩm', 'error');
            console.error('Save product error:', error);
        }
    }

    // --- ORDER HANDLERS ---
    function handleViewOrder(e) {
        const orderId = e.target.closest('tr').dataset.id;
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
            // Show order details modal (implement if needed)
            showNotification(`Xem chi tiết đơn hàng #${orderId}`, 'info');
        }
    }

    async function handleUpdateOrderStatus(e) {
        const orderId = e.target.closest('tr').dataset.id;
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
            const newStatus = prompt('Nhập trạng thái mới (pending/processing/completed/cancelled):', order.status);
            if (newStatus && newStatus !== order.status) {
                try {
                    showLoading();
                    const res = await fetch(`/api/orders/${orderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                        credentials: 'include'
                    });
                    
                    if (!res.ok) throw new Error('Cập nhật thất bại');
                    
                    await loadOrders();
                    renderOrdersTable();
                    renderRecentOrders();
                    hideLoading();
                    showNotification('Đã cập nhật trạng thái đơn hàng', 'success');
                } catch (error) {
                    hideLoading();
                    showNotification(error.message, 'error');
                }
            }
        }
    }

    // --- USER HANDLERS ---
    function handleEditUser(e) {
        const userId = e.target.closest('tr').dataset.id;
        const user = state.users.find(u => u.id === userId);
        if (user) {
            // Show user edit modal (implement if needed)
            showNotification(`Chỉnh sửa thông tin người dùng: ${user.name}`, 'info');
        }
    }

    async function handleDeleteUser(e) {
        const userId = e.target.closest('tr').dataset.id;
        const user = state.users.find(u => u.id === userId);
        
        if (confirm(`Bạn có chắc chắn muốn xóa người dùng "${user?.name}"?`)) {
            try {
                showLoading();
                const res = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Xóa thất bại');
                
                await loadUsers();
                renderUsersTable();
                await loadDashboardStats();
                qs('#totalUsers').textContent = state.stats.userCount || 0;
                hideLoading();
                showNotification('Đã xóa người dùng thành công', 'success');

        } catch (error) {
                hideLoading();
                showNotification(error.message, 'error');
            }
        }
    }

    // --- START ---
    checkAuth();
});