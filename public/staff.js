document.addEventListener('DOMContentLoaded', () => {
    const qs = s => document.querySelector(s);
    const qsa = s => document.querySelectorAll(s);
    const fmt = n => n.toLocaleString('vi-VN') + ' VND';

    let state = {
        user: null,
        orders: [],
        stats: {
            pending: 0,
            processing: 0,
            completed: 0,
            total: 0
        },
        filters: {
            status: '',
            time: ''
        }
    };

    // --- AUTH & INIT ---
    async function checkAuth() {
        try {
            showLoading();
            const res = await fetch('/api/me', { credentials: 'include' });
            if (!res.ok) throw new Error('Not authenticated');
            const data = await res.json();
            if (!data.user || (data.user.role !== 'staff' && data.user.role !== 'admin')) {
                window.location.href = '/';
                return;
            }
            state.user = data.user;
            qs('#staffName').textContent = state.user.name;
            await initializeStaffPanel();
            hideLoading();
        } catch (error) {
            hideLoading();
            window.location.href = '/';
        }
    }

    async function initializeStaffPanel() {
        try {
            await loadOrders();
            renderStats();
            renderOrders();
            setupEventListeners();
            setupDelegatedEventListeners();
            setupAutoRefresh();
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
    async function loadOrders() {
        try {
            const res = await fetch('/api/orders', { credentials: 'include' });
            const data = await res.json();
            state.orders = data.orders || [];
            calculateStats();
        } catch (error) {
            console.error('Error loading orders:', error);
            showNotification('Không thể tải danh sách đơn hàng', 'error');
        }
    }

    function calculateStats() {
        state.stats = {
            pending: state.orders.filter(o => o.status === 'pending').length,
            processing: state.orders.filter(o => o.status === 'processing').length,
            completed: state.orders.filter(o => o.status === 'completed').length,
            total: state.orders.length
        };
    }

    // --- RENDERING ---
    function renderStats() {
        qs('#pendingOrders').textContent = state.stats.pending;
        qs('#processingOrders').textContent = state.stats.processing;
        qs('#completedOrders').textContent = state.stats.completed;
        qs('#totalOrders').textContent = state.stats.total;
    }

    function renderOrders() {
        const filteredOrders = filterOrders();
        const container = qs('#ordersList');
        
        if (filteredOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Không có đơn hàng nào</h3>
                    <p>Chưa có đơn hàng nào phù hợp với bộ lọc hiện tại</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredOrders.map(order => `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <h3>#${order.id}</h3>
                        <p>${order.customerName || 'Khách vãng lai'} • ${formatDate(order.createdAt)}</p>
                    </div>
                    <div class="order-status ${order.status}">${getStatusText(order.status)}</div>
                </div>
                
                <div class="order-details">
                    <div class="order-items">
                        ${order.items?.map(item => `
                            <div>${item.quantity}x ${item.name} - ${fmt(item.price)}</div>
                        `).join('') || 'Không có sản phẩm'}
                    </div>
                    <div class="order-total">${fmt(order.total || 0)}</div>
                </div>
                
                ${order.note ? `<div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-light); font-style: italic;">Ghi chú: ${order.note}</div>` : ''}
                
                <div class="order-actions">
                    ${getOrderActions(order)}
                </div>
            </div>
        `).join('');
    }

    function getOrderActions(order) {
        const actions = [];
        
        if (order.status === 'pending') {
            actions.push(`
                <button class="btn-status accept" data-action="accept" data-id="${order.id}">
                    <i class="fas fa-check"></i> Nhận đơn
                </button>
                <button class="btn-status cancel" data-action="cancel" data-id="${order.id}">
                    <i class="fas fa-times"></i> Hủy đơn
                </button>
            `);
        } else if (order.status === 'processing') {
            actions.push(`
                <button class="btn-status complete" data-action="complete" data-id="${order.id}">
                    <i class="fas fa-check-circle"></i> Hoàn thành
                </button>
            `);
        }
        
        return actions.join('');
    }

    // --- FILTERING ---
    function filterOrders() {
        return state.orders.filter(order => {
            const matchesStatus = !state.filters.status || order.status === state.filters.status;
            const matchesTime = !state.filters.time || matchesTimeFilter(order.createdAt, state.filters.time);
            return matchesStatus && matchesTime;
        });
    }

    function matchesTimeFilter(dateString, timeFilter) {
        const orderDate = new Date(dateString);
        const now = new Date();
        
        switch (timeFilter) {
            case 'today':
                return orderDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return orderDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return orderDate >= monthAgo;
            default:
                return true;
        }
    }

    // --- UTILITY FUNCTIONS ---
    function getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'processing': 'Đang xử lý',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
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

        // Refresh button
        qs('#refreshOrders').addEventListener('click', async () => {
            showLoading();
            await loadOrders();
            renderStats();
            renderOrders();
            hideLoading();
            showNotification('Đã cập nhật danh sách đơn hàng', 'success');
        });

        // Filters
        qs('#statusFilter').addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            renderOrders();
        });

        qs('#timeFilter').addEventListener('change', (e) => {
            state.filters.time = e.target.value;
            renderOrders();
        });
    }

    function setupDelegatedEventListeners() {
        // Event delegation for order actions
        qs('#ordersList').addEventListener('click', (e) => {
            const targetButton = e.target.closest('.btn-status');
            if (targetButton) {
                handleOrderAction(targetButton);
            }
        });
    }

    function setupAutoRefresh() {
        // Auto refresh every 30 seconds
        setInterval(async () => {
            try {
                await loadOrders();
                renderStats();
                renderOrders();
            } catch (error) {
                console.error('Auto refresh error:', error);
            }
        }, 30000);
    }

    async function handleOrderAction(button) {
        const action = button.dataset.action;
        const orderId = button.dataset.id;
        const order = state.orders.find(o => o.id === orderId);
        
        if (!order) return;

        let newStatus;
        let confirmMessage;
        
        switch (action) {
            case 'accept':
                newStatus = 'processing';
                confirmMessage = `Xác nhận nhận đơn hàng #${orderId}?`;
                break;
            case 'complete':
                newStatus = 'completed';
                confirmMessage = `Xác nhận hoàn thành đơn hàng #${orderId}?`;
                break;
            case 'cancel':
                newStatus = 'cancelled';
                confirmMessage = `Xác nhận hủy đơn hàng #${orderId}?`;
                break;
            default:
                return;
        }

        if (confirm(confirmMessage)) {
            try {
                showLoading();
                const res = await fetch(`/api/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                    credentials: 'include'
                });
                
                if (!res.ok) throw new Error('Cập nhật thất bại');
                
                await refreshUI(true, `Đã ${getActionText(action)} đơn hàng #${orderId}`);
            } catch (error) {
                hideLoading();
                showNotification(error.message, 'error');
            }
        }
    }

    async function refreshUI(showNotif = false, message = 'Đã cập nhật dữ liệu') {
        showLoading();
        try {
            await loadOrders();
            renderStats();
            renderOrders();
            if (showNotif) showNotification(message, 'success');
        } catch (error) {
            showNotification('Lỗi khi làm mới giao diện', 'error');
        } finally {
            hideLoading();
        }
    }

    function getActionText(action) {
        const actionMap = {
            'accept': 'nhận',
            'complete': 'hoàn thành',
            'cancel': 'hủy'
        };
        return actionMap[action] || action;
    }

    // --- START ---
    checkAuth();
    setupDelegatedEventListeners();
});


