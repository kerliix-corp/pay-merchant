const ACCOUNT_STORAGE_KEY = 'kerliix_account';

function logTrace(event, details = {}) {
  console.log(`[account] ${event}`, details);
}

function getAccountData() {
  try {
    const data = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  
  return {
    profile: {
      fullName: '',
      email: '',
      phone: ''
    },
    addresses: [],
    paymentMethods: [],
    preferences: {
      newsletter: false,
      orderUpdates: true,
      currency: 'USD'
    }
  };
}

function saveAccountData(data) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(data));
}

function renderAddresses() {
  const accountData = getAccountData();
  const addressesList = document.getElementById('addressesList');
  
  if (!addressesList) return;
  
  if (accountData.addresses.length === 0) {
    addressesList.innerHTML = '<p style="color: var(--muted);">No addresses saved yet.</p>';
    return;
  }
  
  addressesList.innerHTML = accountData.addresses.map((address, index) => `
    <div class="address-card">
      <div>
        <strong>${address.name}</strong><br>
        ${address.street}<br>
        ${address.city}, ${address.state} ${address.zip}<br>
        ${address.country}
      </div>
      <div class="address-actions">
        <button class="icon-btn edit-address" data-index="${index}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn delete-address" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `);
  
  document.querySelectorAll('.edit-address').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      editAddress(index);
    });
  });
  
  document.querySelectorAll('.delete-address').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      deleteAddress(index);
    });
  });
}

function renderPaymentMethods() {
  const accountData = getAccountData();
  const paymentMethodsList = document.getElementById('paymentMethodsList');
  
  if (!paymentMethodsList) return;
  
  if (accountData.paymentMethods.length === 0) {
    paymentMethodsList.innerHTML = '<p style="color: var(--muted);">No payment methods saved yet.</p>';
    return;
  }
  
  paymentMethodsList.innerHTML = accountData.paymentMethods.map((method, index) => `
    <div class="payment-card">
      <div>
        <i class="fab fa-cc-${method.type === 'visa' ? 'visa' : method.type === 'mastercard' ? 'mastercard' : 'paypal'}"></i>
        <strong>${method.cardNumber || method.email}</strong><br>
        ${method.expiry ? `Expires: ${method.expiry}` : ''}
      </div>
      <div class="payment-actions">
        <button class="icon-btn edit-payment" data-index="${index}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn delete-payment" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `);
  
  document.querySelectorAll('.edit-payment').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      editPaymentMethod(index);
    });
  });
  
  document.querySelectorAll('.delete-payment').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      deletePaymentMethod(index);
    });
  });
}

function editAddress(index) {
  const accountData = getAccountData();
  const address = accountData.addresses[index];
  
  const newAddress = prompt('Edit address (format: Name, Street, City, State, Zip, Country)', 
    `${address.name}, ${address.street}, ${address.city}, ${address.state}, ${address.zip}, ${address.country}`);
  
  if (newAddress) {
    const parts = newAddress.split(',').map(p => p.trim());
    if (parts.length >= 6) {
      accountData.addresses[index] = {
        name: parts[0],
        street: parts[1],
        city: parts[2],
        state: parts[3],
        zip: parts[4],
        country: parts[5]
      };
      saveAccountData(accountData);
      renderAddresses();
      logTrace('address_updated', { index });
    }
  }
}

function deleteAddress(index) {
  if (confirm('Delete this address?')) {
    const accountData = getAccountData();
    accountData.addresses.splice(index, 1);
    saveAccountData(accountData);
    renderAddresses();
    logTrace('address_deleted', { index });
  }
}

function editPaymentMethod(index) {
  const accountData = getAccountData();
  const method = accountData.paymentMethods[index];
  
  const newDetails = prompt('Edit payment method details', 
    method.cardNumber ? `${method.type}, ${method.cardNumber}, ${method.expiry}` : method.email);
  
  if (newDetails) {
    const parts = newDetails.split(',');
    if (method.cardNumber && parts.length >= 3) {
      accountData.paymentMethods[index] = {
        type: parts[0].trim().toLowerCase(),
        cardNumber: parts[1].trim(),
        expiry: parts[2].trim()
      };
    } else if (!method.cardNumber && parts.length >= 1) {
      accountData.paymentMethods[index] = {
        type: 'paypal',
        email: parts[0].trim()
      };
    }
    saveAccountData(accountData);
    renderPaymentMethods();
    logTrace('payment_method_updated', { index });
  }
}

function deletePaymentMethod(index) {
  if (confirm('Delete this payment method?')) {
    const accountData = getAccountData();
    accountData.paymentMethods.splice(index, 1);
    saveAccountData(accountData);
    renderPaymentMethods();
    logTrace('payment_method_deleted', { index });
  }
}

function initAccount() {
  const accountData = getAccountData();
  
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    document.getElementById('fullName').value = accountData.profile.fullName || '';
    document.getElementById('email').value = accountData.profile.email || '';
    document.getElementById('phone').value = accountData.profile.phone || '';
    
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      accountData.profile.fullName = document.getElementById('fullName').value;
      accountData.profile.email = document.getElementById('email').value;
      accountData.profile.phone = document.getElementById('phone').value;
      saveAccountData(accountData);
      alert('Profile updated successfully!');
      logTrace('profile_updated');
    });
  }
  
  const addAddressBtn = document.getElementById('addAddressBtn');
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', () => {
      const addressStr = prompt('Add new address (format: Name, Street, City, State, Zip, Country)');
      if (addressStr) {
        const parts = addressStr.split(',').map(p => p.trim());
        if (parts.length >= 6) {
          accountData.addresses.push({
            name: parts[0],
            street: parts[1],
            city: parts[2],
            state: parts[3],
            zip: parts[4],
            country: parts[5]
          });
          saveAccountData(accountData);
          renderAddresses();
          logTrace('address_added');
        } else {
          alert('Please provide all required fields separated by commas');
        }
      }
    });
  }
  
  const addPaymentBtn = document.getElementById('addPaymentBtn');
  if (addPaymentBtn) {
    addPaymentBtn.addEventListener('click', () => {
      const type = prompt('Payment type (visa/mastercard/paypal):');
      if (type === 'paypal') {
        const email = prompt('PayPal email:');
        if (email) {
          accountData.paymentMethods.push({
            type: 'paypal',
            email: email
          });
          saveAccountData(accountData);
          renderPaymentMethods();
          logTrace('payment_method_added', { type: 'paypal' });
        }
      } else if (type === 'visa' || type === 'mastercard') {
        const cardNumber = prompt('Card number:');
        const expiry = prompt('Expiry (MM/YY):');
        if (cardNumber && expiry) {
          accountData.paymentMethods.push({
            type: type,
            cardNumber: cardNumber,
            expiry: expiry
          });
          saveAccountData(accountData);
          renderPaymentMethods();
          logTrace('payment_method_added', { type });
        }
      }
    });
  }
  
  const securityForm = document.getElementById('securityForm');
  if (securityForm) {
    securityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPwd = document.getElementById('currentPassword').value;
      const newPwd = document.getElementById('newPassword').value;
      const confirmPwd = document.getElementById('confirmPassword').value;
      
      if (!currentPwd) {
        alert('Please enter your current password');
        return;
      }
      if (newPwd !== confirmPwd) {
        alert('New passwords do not match');
        return;
      }
      if (newPwd.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      
      alert('Password updated successfully!');
      securityForm.reset();
      logTrace('password_updated');
    });
  }
  
  const preferencesForm = document.getElementById('preferencesForm');
  if (preferencesForm) {
    document.getElementById('newsletter').checked = accountData.preferences.newsletter;
    document.getElementById('orderUpdates').checked = accountData.preferences.orderUpdates;
    document.getElementById('currency').value = accountData.preferences.currency;
    
    preferencesForm.addEventListener('submit', (e) => {
      e.preventDefault();
      accountData.preferences.newsletter = document.getElementById('newsletter').checked;
      accountData.preferences.orderUpdates = document.getElementById('orderUpdates').checked;
      accountData.preferences.currency = document.getElementById('currency').value;
      saveAccountData(accountData);
      alert('Preferences saved!');
      logTrace('preferences_updated');
    });
  }
  
  renderAddresses();
  renderPaymentMethods();
}

document.addEventListener('DOMContentLoaded', () => {
  initAccount();
});

