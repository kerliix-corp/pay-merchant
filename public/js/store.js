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

function formatUgx(amount) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0
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
    const categoryUrl = `/category/${encodeURIComponent(category)}`;
    
    return `
      <section class="category-section">
        <div class="category-header">
          <div>
            <h2 class="category-title">
              <i class="fas fa-tag"></i>
              ${category}
            </h2>
            <p class="category-count">${categoryProducts.length} item${categoryProducts.length !== 1 ? 's' : ''}</p>
          </div>
          <a href="${categoryUrl}" class="view-all-link">
            View All
            <i class="fas fa-arrow-right"></i>
          </a>
        </div>
        <div class="horizontal-scroll-container">
          <div class="product-grid-horizontal">
            ${categoryProducts.map(product => `
              <article class="product-card-horizontal" data-product-id="${product.id}">
                <div class="product-image-wrap">
                  <span class="product-badge">
                    <i class="fas fa-star"></i>
                    ${product.badge}
                  </span>
                  <img src="${product.imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
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
                  <p>${product.description.substring(0, 60)}...</p>
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
        </div>
      </section>
    `;
  }).join('');
  
  attachAddToCartEvents();
  attachProductClickEvents();
}

function attachProductClickEvents() {
  const productCards = document.querySelectorAll('.product-card-horizontal, .product-card');
  productCards.forEach(card => {
    card.removeEventListener('click', handleProductClick);
    card.addEventListener('click', handleProductClick);
  });
}

function handleProductClick(e) {
  if (e.target.closest('.add-to-cart-btn')) {
    return;
  }
  
  const card = e.currentTarget;
  const productId = card.getAttribute('data-product-id');
  if (productId) {
    window.location.href = `/product/${productId}`;
  }
}

function attachAddToCartEvents() {
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  addToCartButtons.forEach((button) => {
    button.removeEventListener('click', handleAddToCartClick);
    button.addEventListener('click', handleAddToCartClick);
  });
}

function handleAddToCartClick(e) {
  e.stopPropagation();
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
  const checkoutMessage = document.getElementById("checkoutMessage");

  if (!cart.length) {
    if (checkoutMessage) checkoutMessage.textContent = "Your cart is empty.";
    return;
  }

  window.location.href = "/order-details";
}

function getDeliveryFee(area, option) {
  const matrix = {
    kampala: { standard: 5000, express: 10000 },
    "greater-kampala": { standard: 9000, express: 15000 },
    upcountry: { standard: 15000, express: 25000 }
  };

  return matrix[area]?.[option] || 5000;
}

function getSelectedPaymentMethod() {
  const active = document.querySelector(".payment-choice.active");
  return active?.dataset.method || "card";
}

function renderOrderDetailsPage() {
  const cartItemsEl = document.getElementById("orderCartItems");
  if (!cartItemsEl) return;

  const cart = getCart();
  const emptyState = document.getElementById("orderEmptyState");
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotalUsd = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const subtotal = Math.round(subtotalUsd * 3700);
  const deliveryArea = document.getElementById("deliveryArea")?.value || "kampala";
  const deliveryOption = document.getElementById("deliveryOption")?.value || "standard";
  const deliveryFee = getDeliveryFee(deliveryArea, deliveryOption);
  const total = subtotal + deliveryFee;
  const hint = document.getElementById("checkoutMethodHint");

  document.getElementById("orderSummaryItems").textContent = String(itemCount);
  document.getElementById("orderSummarySubtotal").textContent = formatUgx(subtotal);
  document.getElementById("orderSummaryDelivery").textContent = formatUgx(deliveryFee);
  document.getElementById("orderSummaryTotal").textContent = formatUgx(total);

  const method = getSelectedPaymentMethod();
  if (hint) {
    hint.textContent = method === "card"
      ? "The next page will open a card-specific checkout."
      : `The next page will prepare a ${method === "mtn" ? "MTN" : "Airtel"} mobile money checkout.`;
  }

  if (!cart.length) {
    cartItemsEl.innerHTML = "";
    if (emptyState) emptyState.hidden = false;
    const proceedBtn = document.getElementById("proceedToCheckoutBtn");
    if (proceedBtn) proceedBtn.disabled = true;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  cartItemsEl.innerHTML = cart.map((item) => `
    <article class="cart-item">
      <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-copy">
        <p class="product-sku">${item.sku}</p>
        <h3>${item.name}</h3>
        <p>${item.quantity} x ${formatCurrency(item.price)}</p>
        <div class="product-retailer">
          <span>${item.retailer || "Direct"}</span>
        </div>
      </div>
      <strong>${formatUgx(Math.round(item.price * item.quantity * 3700))}</strong>
    </article>
  `).join("");
}

async function submitOrderDetails() {
  const cart = getCart();
  const button = document.getElementById("proceedToCheckoutBtn");
  const message = document.getElementById("orderDetailsMessage");
  const form = document.getElementById("orderDetailsForm");

  if (!cart.length) {
    if (message) message.textContent = "Your cart is empty.";
    return;
  }

  const formData = new FormData(form);
  const paymentMethod = getSelectedPaymentMethod();
  const shippingCost = getDeliveryFee(formData.get("deliveryArea"), formData.get("deliveryOption"));

  if (button) {
    button.disabled = true;
    button.textContent = "Preparing checkout...";
  }
  if (message) message.textContent = "";

  try {
    const response = await fetch("/api/checkout-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          price: item.price,
          quantity: item.quantity,
          retailer: item.retailer
        })),
        customerName: formData.get("customerName"),
        customerEmail: formData.get("customerEmail"),
        shippingAddress: {
          street: formData.get("street"),
          city: formData.get("city"),
          country: formData.get("country"),
          state: formData.get("deliveryArea"),
          phone: formData.get("customerPhone")
        },
        deliveryOption: formData.get("deliveryOption"),
        deliveryNotes: formData.get("deliveryNotes"),
        shippingCost,
        paymentMethod
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "We couldn't prepare the checkout.");
    }

    window.location.href = data.checkoutUrl || `/checkout/${data.merchantOrderId}`;
  } catch (error) {
    if (message) message.textContent = error.message;
    if (button) {
      button.disabled = false;
      button.textContent = "Continue to checkout";
    }
  }
}

function initOrderDetailsPage() {
  renderOrderDetailsPage();

  document.querySelectorAll(".payment-choice").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".payment-choice").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderOrderDetailsPage();
    });
  });

  ["deliveryArea", "deliveryOption"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      field.addEventListener("change", renderOrderDetailsPage);
    }
  });

  const submitButton = document.getElementById("proceedToCheckoutBtn");
  if (submitButton) {
    submitButton.addEventListener("click", submitOrderDetails);
  }
}

async function verifyCheckoutPayment(merchantOrderId, paymentReference, statusMessage, shouldClearCart = true) {
  const response = await fetch(`/api/orders/${merchantOrderId}/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentReference })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Payment verification failed.");
  }

  if (data.paid) {
    if (shouldClearCart) {
      saveCart([]);
      syncCartBadge();
    }
    window.location.href = `/orders/${merchantOrderId}`;
    return;
  }

  if (statusMessage) {
    statusMessage.textContent = data.status === "payment_session_created"
      ? "Payment is still pending. We’ll keep checking."
      : "Payment has not completed yet.";
  }
}

function initCheckoutPage() {
  const order = window.__CHECKOUT_ORDER__;
  if (!order) return;

  const statusMessage = document.getElementById("checkoutStatusMessage");

  if (order.paymentMethod === "card") {
    const cardButton = document.getElementById("cardCheckoutBtn");
    if (!cardButton) return;

    cardButton.addEventListener("click", () => {
      const seerbit = window.__SEERBIT__ || {};
      if (!seerbit.publicKey || typeof window.SeerbitPay !== "function") {
        statusMessage.textContent = "SeerBit card checkout is not configured yet.";
        return;
      }

      statusMessage.textContent = "Opening secure card checkout...";

      window.SeerbitPay(
        {
          public_key: seerbit.publicKey,
          tranref: order.paymentReference || order.merchantOrderId,
          currency: order.currency || "UGX",
          country: seerbit.country || "UG",
          amount: String(order.total),
          email: order.customerEmail,
          full_name: order.customerName,
          mobile_no: order.shippingAddress?.phone || "",
          description: `Order ${order.merchantOrderId}`,
          callbackurl: seerbit.redirectUrl || `${window.location.origin}/orders/${order.merchantOrderId}`,
          setAmountByCustomer: false,
          tokenize: false,
          split: order.metadata?.split?.seerbit || undefined,
          customization: {
            payment_method: ["card"],
            theme: {
              background_color: "F9F5EE",
              button_color: "17203A"
            }
          }
        },
        async function callback(response) {
          try {
            const paymentReference = response?.paymentReference || response?.reference || response?.tranref || order.paymentReference;
            statusMessage.textContent = "Verifying payment...";
            await verifyCheckoutPayment(order.merchantOrderId, paymentReference, statusMessage, true);
          } catch (error) {
            statusMessage.textContent = error.message;
          }
        },
        function close() {
          if (!statusMessage.textContent) {
            statusMessage.textContent = "Checkout window closed before payment confirmation.";
          }
        }
      );
    });

    return;
  }

  const mobileButton = document.getElementById("mobileMoneyBtn");
  const mobileInput = document.getElementById("mobileMoneyNumber");
  if (!mobileButton || !mobileInput) return;

  let pollHandle = null;

  mobileButton.addEventListener("click", async () => {
    statusMessage.textContent = "";
    mobileButton.disabled = true;
    mobileButton.textContent = "Sending prompt...";

    try {
      const response = await fetch(`/api/orders/${order.merchantOrderId}/mobile-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: order.paymentMethod === "mtn" ? "MTN" : "AIRTEL",
          mobileNumber: mobileInput.value.trim()
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to send mobile money prompt.");
      }

      statusMessage.textContent = data.message || "Payment prompt sent. Waiting for approval...";

      if (pollHandle) {
        window.clearInterval(pollHandle);
      }

      pollHandle = window.setInterval(async () => {
        try {
          await verifyCheckoutPayment(order.merchantOrderId, order.paymentReference, statusMessage, true);
        } catch (error) {
          statusMessage.textContent = error.message;
        }
      }, 8000);
    } catch (error) {
      statusMessage.textContent = error.message;
      mobileButton.disabled = false;
      mobileButton.textContent = "Send payment prompt";
    }
  });
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

function initDesktopSidebar() {
  const sidebar = document.querySelector('.bottom-nav');
  const toggle = document.querySelector('.sidebar-toggle');

  if (!sidebar || !toggle) return;

  const desktopQuery = window.matchMedia('(min-width: 769px)');
  const storageKey = 'kerliix-desktop-sidebar-collapsed';

  function applyDesktopState() {
    if (!desktopQuery.matches) {
      document.body.classList.remove('sidebar-collapsed');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Expand sidebar');
      return;
    }

    const collapsed = window.localStorage.getItem(storageKey) === 'true';
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }

  toggle.addEventListener('click', () => {
    if (!desktopQuery.matches) return;

    const nextCollapsed = !document.body.classList.contains('sidebar-collapsed');
    window.localStorage.setItem(storageKey, String(nextCollapsed));
    applyDesktopState();
  });

  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', applyDesktopState);
  } else if (typeof desktopQuery.addListener === 'function') {
    desktopQuery.addListener(applyDesktopState);
  }

  applyDesktopState();
}

function initCategoryPage() {
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      const grid = document.getElementById('productGrid');
      if (!grid) return;
      
      const products = Array.from(grid.querySelectorAll('.product-card'));
      const sortValue = this.value;
      
      products.sort((a, b) => {
        const priceA = parseFloat(a.querySelector('.product-price')?.textContent.replace('$', '') || 0);
        const priceB = parseFloat(b.querySelector('.product-price')?.textContent.replace('$', '') || 0);
        const nameA = a.querySelector('h3')?.textContent || '';
        const nameB = b.querySelector('h3')?.textContent || '';
        
        if (sortValue === 'price-asc') return priceA - priceB;
        if (sortValue === 'price-desc') return priceB - priceA;
        if (sortValue === 'name-asc') return nameA.localeCompare(nameB);
        return 0;
      });
      
      products.forEach(product => grid.appendChild(product));
    });
  }
  
  attachProductClickEvents();
}

document.addEventListener("DOMContentLoaded", () => {
  logTrace("dom_content_loaded", {
    path: window.location.pathname,
    paymentAppUrl: document.body.dataset.paymentAppUrl,
    cartCount: getCartCount()
  });
  syncCartBadge();
  initMobileMenu();
  initDesktopSidebar();

  if (document.querySelector(".product-grid") || document.getElementById("productCategories")) {
    if (document.getElementById("productCategories")) {
      renderCatalogPage();
    } else {
      attachProductClickEvents();
      attachAddToCartEvents();
    }
  }
  
  if (document.getElementById("sortBy")) {
    initCategoryPage();
  }

  if (document.getElementById("cartItems")) {
    renderCartPage();
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", createPaymentSession);
    }
  }

  if (document.getElementById("orderDetailsForm")) {
    initOrderDetailsPage();
  }

  if (window.__CHECKOUT_ORDER__) {
    initCheckoutPage();
  }
});
