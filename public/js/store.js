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

function renderCatalogPage() {
  document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.productId);
      button.textContent = "Added";
      window.setTimeout(() => {
        button.textContent = "Add to cart";
      }, 900);
    });
  });

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

  summaryItems.textContent = String(itemCount);
  summarySubtotal.textContent = formatCurrency(subtotal);
  summaryTotal.textContent = formatCurrency(subtotal);
  checkoutBtn.disabled = cart.length === 0;

  if (!cart.length) {
    cartItemsEl.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  cartItemsEl.innerHTML = cart.map((item) => `
    <article class="cart-item">
      <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-copy">
        <p class="product-sku">${item.sku}</p>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="cart-item-controls">
          <button class="qty-btn" data-action="decrease" data-product-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="increase" data-product-id="${item.id}">+</button>
          <button class="remove-btn" data-product-id="${item.id}">Remove</button>
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
    checkoutMessage.textContent = "Your cart is empty.";
    return;
  }

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Creating payment session...";
  checkoutMessage.textContent = "";

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
        items: cart
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
    checkoutMessage.textContent = error.message;
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Proceed to payment";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  logTrace("dom_content_loaded", {
    path: window.location.pathname,
    paymentAppUrl: document.body.dataset.paymentAppUrl,
    cartCount: getCartCount()
  });
  syncCartBadge();

  if (document.querySelector(".product-grid")) {
    renderCatalogPage();
  }

  if (document.getElementById("cartItems")) {
    renderCartPage();
    document.getElementById("checkoutBtn").addEventListener("click", createPaymentSession);
  }
});
