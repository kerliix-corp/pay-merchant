const PROFILE_STORAGE_KEY = 'kerliix_account';
const ORDERS_STORAGE_KEY = 'kerliix_orders';

function logTrace(event, details = {}) {
  console.log(`[profile] ${event}`, details);
}

function getAccountData() {
  try {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  
  return {
    profile: {
      fullName: 'Guest User',
      email: 'guest@example.com',
      phone: ''
    }
  };
}

function getOrders() {
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

function getWishlistCount() {
  try {
    const wishlist = JSON.parse(localStorage.getItem('kerliix_wishlist') || '[]');
    return Array.isArray(wishlist) ? wishlist.length : 0;
  } catch {
    return 0;
  }
}

function getReviewsCount() {
  try {
    const reviews = JSON.parse(localStorage.getItem('kerliix_reviews') || '[]');
    return Array.isArray(reviews) ? reviews.length : 0;
  } catch {
    return 0;
  }
}

function renderProfile() {
  const accountData = getAccountData();
  const orders = getOrders();
  
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const displayName = document.getElementById('displayName');
  const displayEmail = document.getElementById('displayEmail');
  const displayPhone = document.getElementById('displayPhone');
  const totalOrders = document.getElementById('totalOrders');
  const reviewsCount = document.getElementById('reviewsCount');
  const wishlistCount = document.getElementById('wishlistCount');
  
  if (profileName) profileName.textContent = accountData.profile.fullName || 'Guest User';
  if (profileEmail) profileEmail.textContent = accountData.profile.email || 'guest@example.com';
  if (displayName) displayName.textContent = accountData.profile.fullName || 'Guest User';
  if (displayEmail) displayEmail.textContent = accountData.profile.email || 'guest@example.com';
  if (displayPhone) displayPhone.textContent = accountData.profile.phone || 'Not provided';
  if (totalOrders) totalOrders.textContent = orders.length;
  if (reviewsCount) reviewsCount.textContent = getReviewsCount();
  if (wishlistCount) wishlistCount.textContent = getWishlistCount();
  
  const recentOrders = orders.slice(0, 3);
  const recentOrdersDiv = document.getElementById('recentOrders');
  
  if (recentOrdersDiv) {
    if (recentOrders.length === 0) {
      recentOrdersDiv.innerHTML = '<p style="color: var(--muted);">No recent orders</p>';
    } else {
      recentOrdersDiv.innerHTML = recentOrders.map(order => `
        <div class="recent-order-item">
          <div class="recent-order-id">Order #${order.id}</div>
          <div class="recent-order-date">${new Date(order.createdAt).toLocaleDateString()}</div>
          <div class="recent-order-total">$${order.total.toFixed(2)}</div>
        </div>
      `).join('');
    }
  }
}

function initProfile() {
  renderProfile();
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const accountData = getAccountData();
      
      if (field === 'name') {
        const newName = prompt('Enter your full name:', accountData.profile.fullName);
        if (newName && newName.trim()) {
          accountData.profile.fullName = newName.trim();
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(accountData));
          renderProfile();
          logTrace('name_updated', { newName });
        }
      } else if (field === 'email') {
        const newEmail = prompt('Enter your email:', accountData.profile.email);
        if (newEmail && newEmail.includes('@')) {
          accountData.profile.email = newEmail.trim();
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(accountData));
          renderProfile();
          logTrace('email_updated', { newEmail });
        } else if (newEmail) {
          alert('Please enter a valid email address');
        }
      } else if (field === 'phone') {
        const newPhone = prompt('Enter your phone number:', accountData.profile.phone);
        if (newPhone !== null) {
          accountData.profile.phone = newPhone.trim();
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(accountData));
          renderProfile();
          logTrace('phone_updated', { newPhone });
        }
      }
    });
  });
  
  const changeAvatarBtn = document.getElementById('changeAvatar');
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => {
      alert('Avatar customization coming soon!');
      logTrace('avatar_change_clicked');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initProfile();
});

