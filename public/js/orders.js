const orders = Array.isArray(window.__ORDERS__) ? window.__ORDERS__ : [];

function logTrace(event, details = {}) {
  console.log(`[orders] ${event}`, details);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(amount, currency = 'UGX') {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function getOrdersByStatus(status = 'all') {
  if (status === 'all') return orders;
  return orders.filter(order => order.status === status);
}

function getStatusIcon(status) {
  const icons = {
    pending_checkout: 'fa-clock',
    payment_session_created: 'fa-credit-card',
    processing: 'fa-spinner',
    shipped: 'fa-truck',
    out_for_delivery: 'fa-truck-fast',
    delivered: 'fa-check-circle',
    cancelled: 'fa-times-circle',
    payment_failed: 'fa-circle-xmark',
    checkout_creation_failed: 'fa-circle-exclamation',
    paid: 'fa-circle-check'
  };
  return icons[status] || 'fa-box';
}

function renderOrders() {
  const activeStatus = document.querySelector('.order-filter-btn.active')?.dataset.status || 'all';
  const filteredOrders = getOrdersByStatus(activeStatus);
  const ordersList = document.getElementById('ordersList');
  const noOrdersDiv = document.getElementById('noOrders');
  
  if (!ordersList || !noOrdersDiv) return;
  
  if (filteredOrders.length === 0) {
    ordersList.innerHTML = '';
    noOrdersDiv.style.display = 'block';
    return;
  }
  
  noOrdersDiv.style.display = 'none';
  
  ordersList.innerHTML = filteredOrders.map(order => `
    <div class="order-card" data-order-id="${order.merchantOrderId}">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order.merchantOrderId}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        <div class="order-status status-${order.status}">
          <i class="fas ${getStatusIcon(order.status)}"></i>
          ${String(order.status || '').replace(/_/g, ' ')}
        </div>
      </div>
      
      <div class="order-items">
        ${(order.items || []).map(item => `
          <div class="order-item">
            <div class="order-item-name">
              <strong>${item.name}</strong>
              ${item.retailer ? `<div style="font-size: 0.8rem; color: var(--muted);">${item.retailer}</div>` : ''}
            </div>
            <div class="order-item-quantity">Qty: ${item.quantity}</div>
            <div class="order-item-price">${formatCurrency((item.price || 0) * (item.quantity || 0), order.currency || 'UGX')}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="order-footer">
        <div class="order-total">Total: ${formatCurrency(order.total, order.currency || 'UGX')}</div>
        <div class="order-actions">
          <button class="order-action-btn track-btn" data-order-id="${order.merchantOrderId}">
            <i class="fas fa-map-marker-alt"></i> Track
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.track-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.orderId;
      showTrackingInfo(orderId);
    });
  });
}

function showTrackingInfo(orderId) {
  const order = orders.find(o => o.merchantOrderId === orderId);
  if (!order) return;
  
  alert(`Tracking Information:\nOrder #${orderId}\nStatus: ${String(order.status || '').replace(/_/g, ' ')}\nEstimated delivery: ${order.estimatedDelivery || 'Processing'}`);
  logTrace('track_order', { orderId, status: order.status });
}

function initOrders() {
  const filterBtns = document.querySelectorAll('.order-filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderOrders();
    });
  });
  
  renderOrders();
}

document.addEventListener('DOMContentLoaded', () => {
  initOrders();
});
