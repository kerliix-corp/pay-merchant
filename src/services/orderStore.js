const orders = new Map();
const webhookEvents = new Set();

function createMerchantOrderId() {
  return `mord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function summarizeItems(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.imageUrl,
        description: item.description,
        sku: item.sku
      }))
    : [];
}

export function createOrder({ items, merchantName }) {
  const merchantOrderId = createMerchantOrderId();
  const normalizedItems = summarizeItems(items);
  const total = Number(
    normalizedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0).toFixed(2)
  );

  const order = {
    merchantOrderId,
    merchantName,
    status: "pending_checkout",
    total,
    currency: "USD",
    items: normalizedItems,
    sessionId: "",
    paymentReference: "",
    gatewayReference: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastEventId: ""
  };

  orders.set(merchantOrderId, order);
  return order;
}

export function getOrder(merchantOrderId) {
  return orders.get(merchantOrderId) || null;
}

export function updateOrder(merchantOrderId, updates) {
  const order = getOrder(merchantOrderId);

  if (!order) {
    return null;
  }

  const nextOrder = {
    ...order,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  orders.set(merchantOrderId, nextOrder);
  return nextOrder;
}

export function markWebhookEventProcessed(eventId) {
  if (!eventId) {
    return false;
  }

  if (webhookEvents.has(eventId)) {
    return false;
  }

  webhookEvents.add(eventId);
  return true;
}
