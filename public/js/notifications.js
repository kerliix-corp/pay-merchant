const NOTIFICATIONS_STORAGE_KEY = 'kerliix_notifications';

function logTrace(event, details = {}) {
  console.log(`[notifications] ${event}`, details);
}

function getDefaultNotifications() {
  return [
    {
      id: '1',
      type: 'order',
      title: 'Order Confirmed',
      message: 'Your order #ORD-1234 has been confirmed and is being processed.',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      orderId: 'ORD-1234'
    },
    {
      id: '2',
      type: 'promotion',
      title: 'Weekend Sale!',
      message: 'Get 20% off on all accessories this weekend. Use code: WEEKEND20',
      time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: '3',
      type: 'update',
      title: 'New Feature Available',
      message: 'Check out our new wishlist feature to save your favorite items.',
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: '4',
      type: 'order',
      title: 'Order Shipped',
      message: 'Your order #ORD-1235 has been shipped and is on its way!',
      time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
      orderId: 'ORD-1235'
    }
  ];
}

function getNotifications() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      const notifications = JSON.parse(stored);
      return Array.isArray(notifications) ? notifications : getDefaultNotifications();
    }
    return getDefaultNotifications();
  } catch {
    return getDefaultNotifications();
  }
}

function saveNotifications(notifications) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

function markAsRead(notificationId) {
  const notifications = getNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveNotifications(notifications);
    renderNotifications();
    logTrace('mark_as_read', { notificationId });
  }
}

function markAllAsRead() {
  const notifications = getNotifications();
  notifications.forEach(n => n.read = true);
  saveNotifications(notifications);
  renderNotifications();
  logTrace('mark_all_as_read');
}

function deleteNotification(notificationId) {
  let notifications = getNotifications();
  notifications = notifications.filter(n => n.id !== notificationId);
  saveNotifications(notifications);
  renderNotifications();
  logTrace('delete_notification', { notificationId });
}

function getNotificationIcon(type) {
  const icons = {
    order: 'fa-shopping-bag',
    promotion: 'fa-tag',
    update: 'fa-bell'
  };
  return icons[type] || 'fa-bell';
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function renderNotifications() {
  const activeFilter = document.querySelector('.notification-filter.active')?.dataset.filter || 'all';
  let notifications = getNotifications();
  
  if (activeFilter === 'unread') {
    notifications = notifications.filter(n => !n.read);
  } else if (activeFilter !== 'all') {
    notifications = notifications.filter(n => n.type === activeFilter);
  }
  
  const notificationsList = document.getElementById('notificationsList');
  const noNotificationsDiv = document.getElementById('noNotifications');
  
  if (!notificationsList) return;
  
  if (notifications.length === 0) {
    notificationsList.innerHTML = '';
    noNotificationsDiv.style.display = 'block';
    return;
  }
  
  noNotificationsDiv.style.display = 'none';
  
  notificationsList.innerHTML = notifications.map(notification => `
    <div class="notification-card ${!notification.read ? 'unread' : ''}" data-id="${notification.id}">
      <div class="notification-icon ${notification.type}">
        <i class="fas ${getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <h4 class="notification-title">${notification.title}</h4>
        <p class="notification-message">${notification.message}</p>
        <span class="notification-time">${formatTimeAgo(notification.time)}</span>
      </div>
      <div class="notification-actions">
        ${!notification.read ? `
          <button class="notification-action mark-read" data-id="${notification.id}">
            <i class="fas fa-check"></i>
          </button>
        ` : ''}
        <button class="notification-action delete" data-id="${notification.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.mark-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      markAsRead(id);
    });
  });
  
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('Delete this notification?')) {
        deleteNotification(id);
      }
    });
  });
  
  document.querySelectorAll('.notification-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (!card.classList.contains('unread')) return;
      markAsRead(id);
    });
  });
}

function initNotifications() {
  const filterBtns = document.querySelectorAll('.notification-filter');
  const markAllBtn = document.getElementById('markAllRead');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotifications();
    });
  });
  
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      markAllAsRead();
    });
  }
  
  renderNotifications();
}

document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
});

