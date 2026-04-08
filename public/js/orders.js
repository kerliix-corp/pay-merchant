const ORDERS_STORAGE_KEY = 'kerliix_orders';

function logTrace(event, details = {}) {
  console.log(`[orders] ${event}`, details);
}

function getOrders() {
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function getOrdersByStatus(status = 'all') {
  const orders = getOrders();
  if (status === 'all') return orders;
  return orders.filter(order => order.status === status);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusIcon(status) {
  const icons = {
    pending: 'fa-clock',
    processing: 'fa-spinner',
    shipped: 'fa-truck',
    delivered: 'fa-check-circle',
    cancelled: 'fa-times-circle'
  };
  return icons[status] || 'fa-box';
}

function renderOrders() {
  const activeStatus = document.querySelector('.order-filter-btn.active')?.dataset.status || 'all';
  const orders = getOrdersByStatus(activeStatus);
  const ordersList = document.getElementById('ordersList');
  const noOrdersDiv = document.getElementById('noOrders');
  
  if (!ordersList) return;
  
  if (orders.length === 0) {
    ordersList.innerHTML = '';
    noOrdersDiv.style.display = 'block';
    return;
  }
  
  noOrdersDiv.style.display = 'none';
  
  ordersList.innerHTML = orders.map(order => `
    <div class="order-card" data-order-id="${order.id}">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order.id}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        <div class="order-status status-${order.status}">
          <i class="fas ${getStatusIcon(order.status)}"></i>
          ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </div>
      </div>
      
      <div class="order-items">
        ${order.items.map(item => `
          <div class="order-item">
            <div class="order-item-name">
              <strong>${item.name}</strong>
              ${item.retailer ? `<div style="font-size: 0.8rem; color: var(--muted);">${item.retailer}</div>` : ''}
            </div>
            <div class="order-item-quantity">Qty: ${item.quantity}</div>
            <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="order-footer">
        <div class="order-total">Total: $${order.total.toFixed(2)}</div>
        <div class="order-actions">
          <button class="order-action-btn track-btn" data-order-id="${order.id}">
            <i class="fas fa-map-marker-alt"></i> Track
          </button>
          <button class="order-action-btn reorder-btn" data-order-id="${order.id}">
            <i class="fas fa-redo"></i> Reorder
          </button>
          ${order.status === 'pending' ? `
            <button class="order-action-btn cancel-btn" data-order-id="${order.id}">
              <i class="fas fa-times"></i> Cancel
            </button>
          ` : ''}
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
  
  document.querySelectorAll('.reorder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.orderId;
      reorderItems(orderId);
    });
  });
  
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.orderId;
      cancelOrder(orderId);
    });
  });
}

function showTrackingInfo(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;
  
  alert(`Tracking Information:\nOrder #${orderId}\nStatus: ${order.status}\nEstimated delivery: ${order.estimatedDelivery || 'Processing'}`);
  logTrace('track_order', { orderId, status: order.status });
}

function reorderItems(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;
  
  order.items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      if (window.addToCart) {
        window.addToCart(item.id);
      }
    }
  });
  
  alert('Items have been added to your cart!');
  window.location.href = '/cart';
  logTrace('reorder_items', { orderId, itemCount: order.items.length });
}

function cancelOrder(orderId) {
  if (confirm('Are you sure you want to cancel this order?')) {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
      orders[orderIndex].status = 'cancelled';
      saveOrders(orders);
      renderOrders();
      logTrace('cancel_order', { orderId });
    }
  }
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

