const order = window.__MERCHANT_ORDER__;

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(amount) || 0);
}

function renderItems(items = []) {
  const container = document.getElementById("orderItems");
  if (!container) {
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="cart-item">
      <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-copy">
        <p class="product-sku">${item.sku || ""}</p>
        <h3>${item.name}</h3>
        <p>${item.description || ""}</p>
      </div>
      <strong>${formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</strong>
    </article>
  `).join("");
}

function getStatusMessage(status) {
  const messages = {
    pending_checkout: "We have created the merchant order and are waiting to start payment.",
    payment_session_created: "Your payment session is ready on Kerliix Pay.",
    confirmed: "The order was confirmed and is now in checkout.",
    pending_auth: "Authentication is in progress.",
    pending_otp: "OTP verification is required.",
    pending_momo: "Mobile money approval is still pending.",
    paid: "Payment completed successfully.",
    failed: "Payment failed. You can try again from the merchant app.",
    checkout_creation_failed: "We could not create a payment session."
  };

  return messages[status] || "Waiting for updates from Kerliix Pay.";
}

function applyOrder(nextOrder) {
  document.getElementById("orderStatusHeading").textContent = nextOrder.status;
  document.getElementById("orderStatusPill").textContent = nextOrder.status;
  document.getElementById("sessionId").textContent = nextOrder.sessionId || "-";
  document.getElementById("paymentReference").textContent = nextOrder.paymentReference || "-";
  document.getElementById("gatewayReference").textContent = nextOrder.gatewayReference || "-";
  document.getElementById("orderTotal").textContent = formatCurrency(nextOrder.total);
  document.getElementById("orderStateLabel").textContent = nextOrder.status;
  document.getElementById("orderStateMessage").textContent = getStatusMessage(nextOrder.status);
  document.getElementById("lastEventId").textContent = nextOrder.lastEventId || "-";
  renderItems(nextOrder.items || []);
}

async function pollOrderStatus() {
  const appBaseUrl = document.body.dataset.appBaseUrl || "";
  let attempts = 0;
  const maxAttempts = 60;

  applyOrder(order);

  const poll = async () => {
    attempts += 1;

    try {
      const response = await fetch(`${appBaseUrl}/api/orders/${encodeURIComponent(order.merchantOrderId)}`);
      if (!response.ok) {
        return;
      }

      const latestOrder = await response.json();
      applyOrder(latestOrder);

      if (!["paid", "failed"].includes(String(latestOrder.status || "").toLowerCase()) && attempts < maxAttempts) {
        window.setTimeout(poll, 3000);
      }
    } catch {
      if (attempts < maxAttempts) {
        window.setTimeout(poll, 3000);
      }
    }
  };

  poll();
}

document.addEventListener("DOMContentLoaded", pollOrderStatus);
