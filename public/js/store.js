const CART_KEY = "kerliix-merchant-cart";
const products = Array.isArray(window.__STORE_PRODUCTS__) ? window.__STORE_PRODUCTS__ : [];
const productIndex = new Map(products.map((product) => [product.id, product]));

function logTrace(event, details = {}) {
  console.log(`[merchant] ${event}`, details);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(amount) || 0);
}

function getCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function syncCartBadge() {
  const badge = document.getElementById("cartCountBadge");
  if (badge) {
    badge.textContent = String(getCartCount());
  }
  
  const bottomBadge = document.getElementById("bottomCartBadge");
  if (bottomBadge) {
    bottomBadge.textContent = String(getCartCount());
  }
  
  const mobileBadge = document.getElementById("mobileCartBadge");
  if (mobileBadge) {
    const count = getCartCount();
    mobileBadge.textContent = String(count);
    mobileBadge.style.display = count > 0 ? "inline-flex" : "none";
  }
}

function addToCart(productId) {
  const product = productIndex.get(productId);
  if (!product) {
    logTrace("add_to_cart_missing_product", { productId });
    return;
  }

  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      price: product.price,
      category: product.category,
      retailer: product.retailer,
      quantity: 1
    });
  }

  saveCart(cart);
  syncCartBadge();
  logTrace("add_to_cart", {
    productId,
    quantity: existing ? existing.quantity : 1,
    cartCount: getCartCount()
  });
}

function updateQuantity(productId, quantity) {
  logTrace("update_quantity_requested", { productId, quantity });
  const cart = getCart()
    .map((item) => item.id === productId ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0);

  saveCart(cart);
  logTrace("update_quantity_applied", {
    productId,
    quantity,
    cartCount: getCartCount()
  });
  renderCartPage();
}

function getUniqueCategories() {
  const cats = new Set(products.map(p => p.category).filter(c => c));
  return ['all', ...Array.from(cats).sort()];
}

function getUniqueRetailers() {
  const retailers = new Set(products.map(p => p.retailer).filter(r => r));
  return ['all', ...Array.from(retailers).sort()];
}

function populateFilters() {
  const categorySelect = document.getElementById('categoryFilter');
  const retailerSelect = document.getElementById('retailerFilter');
  
  if (categorySelect) {
    const categories = getUniqueCategories();
    categorySelect.innerHTML = categories.map(cat => 
      `<option value="${cat}">${cat === 'all' ? 'All Categories' : cat}</option>`
    ).join('');
  }
  
  if (retailerSelect) {
    const retailers = getUniqueRetailers();
    retailerSelect.innerHTML = retailers.map(ret => 
      `<option value="${ret}">${ret === 'all' ? 'All Retailers' : ret}</option>`
    ).join('');
  }
}

function filterProducts() {
  const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
  const retailerFilter = document.getElementById('retailerFilter')?.value || 'all';
  
  let filtered = [...products];
  
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(p => p.category === categoryFilter);
  }
  
  if (retailerFilter !== 'all') {
    filtered = filtered.filter(p => p.retailer === retailerFilter);
  }
  
  renderProductsByCategory(filtered);
}

function renderProductsByCategory(productsToRender) {
  const container = document.getElementById('productCategories');
  if (!container) return;
  
  const productsByCategory = {};
  
  productsToRender.forEach(product => {
    const category = product.category || 'Uncategorized';
    if (!productsByCategory[category]) {
      productsByCategory[category] = [];
    }
    productsByCategory[category].push(product);
  });
  
  const sortedCategories = Object.keys(productsByCategory).sort();
  
  if (sortedCategories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p>No products found matching your filters.</p>
        <button onclick="document.getElementById('resetFilters')?.click()" class="primary-button inline-button" style="width: auto; margin-top: 16px;">
          <i class="fas fa-undo-alt"></i>
          Reset Filters
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = sortedCategories.map(category => {
    const categoryProducts = productsByCategory[category];
    
    return `
      <section class="category-section">
        <div class="category-header">
          <h2 class="category-title">
            <i class="fas fa-tag"></i>
            ${category}
          </h2>
          <p class="category-count">${categoryProducts.length} item${categoryProducts.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="product-grid">
          ${categoryProducts.map(product => `
            <article class="product-card">
              <div class="product-image-wrap">
                <span class="product-badge">
                  <i class="fas fa-star"></i>
                  ${product.badge}
                </span>
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
              </div>
              <div class="product-copy">
                <div class="product-meta">
                  <p class="product-sku">
                    <i class="fas fa-barcode"></i>
                    ${product.sku}
                  </p>
                  <p class="product-price">
                    <i class="fas fa-dollar-sign"></i>
                    ${product.price.toFixed(2)}
                  </p>
                </div>
                <div class="product-retailer">
                  <i class="fas fa-store"></i>
                  <span>${product.retailer || 'Direct'}</span>
                </div>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
              </div>
              <button
                class="primary-button add-to-cart-btn"
                data-product-id="${product.id}"
              >
                <i class="fas fa-cart-plus"></i>
                Add to cart
              </button>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');
  
  attachAddToCartEvents();
}

function attachAddToCartEvents() {
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  addToCartButtons.forEach((button) => {
    button.removeEventListener('click', handleAddToCartClick);
    button.addEventListener('click', handleAddToCartClick);
  });
}

function handleAddToCartClick(e) {
  const button = e.currentTarget;
  const productId = button.getAttribute('data-product-id');
  addToCart(productId);
  
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Added';
  setTimeout(() => {
    button.innerHTML = originalText;
  }, 900);
}

function resetFilters() {
  const categorySelect = document.getElementById('categoryFilter');
  const retailerSelect = document.getElementById('retailerFilter');
  
  if (categorySelect) categorySelect.value = 'all';
  if (retailerSelect) retailerSelect.value = 'all';
  
  filterProducts();
}

function renderCatalogPage() {
  populateFilters();
  renderProductsByCategory(products);
  
  const categoryFilter = document.getElementById('categoryFilter');
  const retailerFilter = document.getElementById('retailerFilter');
  const resetBtn = document.getElementById('resetFilters');
  
  if (categoryFilter) {
    categoryFilter.removeEventListener('change', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
  }
  if (retailerFilter) {
    retailerFilter.removeEventListener('change', filterProducts);
    retailerFilter.addEventListener('change', filterProducts);
  }
  if (resetBtn) {
    resetBtn.removeEventListener('click', resetFilters);
    resetBtn.addEventListener('click', resetFilters);
  }
  
  syncCartBadge();
}

function renderCartPage() {
  const cartItemsEl = document.getElementById("cartItems");
  if (!cartItemsEl) {
    return;
  }

  const cart = getCart();
  const emptyState = document.getElementById("emptyCartState");
  const summaryItems = document.getElementById("summaryItems");
  const summarySubtotal = document.getElementById("summarySubtotal");
  const summaryTotal = document.getElementById("summaryTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (summaryItems) summaryItems.textContent = String(itemCount);
  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(subtotal);
  if (summaryTotal) summaryTotal.textContent = formatCurrency(subtotal);
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

  if (!cart.length) {
    cartItemsEl.innerHTML = "";
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  cartItemsEl.innerHTML = cart.map((item) => `
    <article class="cart-item">
      <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-copy">
        <p class="product-sku">${item.sku}</p>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="product-retailer" style="margin-top: 8px;">
          <i class="fas fa-store"></i>
          <span>${item.retailer || 'Direct'}</span>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-action="decrease" data-product-id="${item.id}">
            <i class="fas fa-minus"></i>
          </button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="increase" data-product-id="${item.id}">
            <i class="fas fa-plus"></i>
          </button>
          <button class="remove-btn" data-product-id="${item.id}">
            <i class="fas fa-trash"></i>
            Remove
          </button>
        </div>
      </div>
      <strong>${formatCurrency(item.price * item.quantity)}</strong>
    </article>
  `).join("");

  cartItemsEl.querySelectorAll(".qty-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const item = cart.find((entry) => entry.id === button.dataset.productId);
      if (!item) {
        return;
      }

      const nextQuantity = button.dataset.action === "increase"
        ? item.quantity + 1
        : item.quantity - 1;

      updateQuantity(item.id, nextQuantity);
    });
  });

  cartItemsEl.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", () => updateQuantity(button.dataset.productId, 0));
  });
}

async function createPaymentSession() {
  const cart = getCart();
  const checkoutBtn = document.getElementById("checkoutBtn");
  const checkoutMessage = document.getElementById("checkoutMessage");

  if (!cart.length) {
    logTrace("create_payment_session_blocked_empty_cart");
    if (checkoutMessage) checkoutMessage.textContent = "Your cart is empty.";
    return;
  }

  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Creating payment session...";
  }
  if (checkoutMessage) checkoutMessage.textContent = "";

  logTrace("create_payment_session_started", {
    endpoint: "/api/checkout-sessions",
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    payload: { items: cart }
  });

  try {
    const response = await fetch("/api/checkout-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku,
          retailer: item.retailer
        }))
      })
    });

    const data = await response.json().catch(() => ({}));

    logTrace("create_payment_session_response", {
      ok: response.ok,
      status: response.status,
      data
    });

    if (!response.ok) {
      throw new Error(data.error || "Payment session could not be created.");
    }

    logTrace("redirecting_to_payment_confirm", {
      paymentUrl: data.paymentUrl,
      merchantOrderId: data.merchantOrderId
    });
    window.location.href = data.paymentUrl;
  } catch (error) {
    logTrace("create_payment_session_failed", {
      message: error.message,
      stack: error.stack
    });
    if (checkoutMessage) checkoutMessage.textContent = error.message;
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Proceed to payment";
    }
  }
}

function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (!mobileMenuToggle || !mobileMenu) return;
  
  const menuIcon = mobileMenuToggle.querySelector('i');
  
  function toggleMenu() {
    mobileMenu.classList.toggle('open');
    
    if (mobileMenu.classList.contains('open')) {
      menuIcon.classList.remove('fa-bars');
      menuIcon.classList.add('fa-times');
      document.body.style.overflow = 'hidden';
    } else {
      menuIcon.classList.remove('fa-times');
      menuIcon.classList.add('fa-bars');
      document.body.style.overflow = '';
    }
  }
  
  mobileMenuToggle.addEventListener('click', toggleMenu);
  
  mobileMenu.addEventListener('click', function(e) {
    if (e.target === mobileMenu) {
      toggleMenu();
    }
  });
  
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', function() {
      if (mobileMenu.classList.contains('open')) {
        toggleMenu();
      }
    });
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      toggleMenu();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  logTrace("dom_content_loaded", {
    path: window.location.pathname,
    paymentAppUrl: document.body.dataset.paymentAppUrl,
    cartCount: getCartCount()
  });
  syncCartBadge();
  initMobileMenu();

  if (document.querySelector(".product-grid") || document.getElementById("productCategories")) {
    renderCatalogPage();
  }

  if (document.getElementById("cartItems")) {
    renderCartPage();
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", createPaymentSession);
    }
  }
});
