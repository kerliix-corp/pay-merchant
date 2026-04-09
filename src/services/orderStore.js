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
        sku: item.sku,
        retailer: item.retailer
      }))
    : [];
}

export function createOrder({ items, merchantName, customerEmail, customerName, shippingAddress, paymentMethod }) {
  const merchantOrderId = createMerchantOrderId();
  const normalizedItems = summarizeItems(items);
  const subtotal = Number(
    normalizedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0).toFixed(2)
  );
  const shipping = Number(process.env.SHIPPING_COST || 5.99);
  const total = Number((subtotal + shipping).toFixed(2));

  const order = {
    merchantOrderId,
    merchantName,
    customerEmail,
    customerName,
    shippingAddress,
    paymentMethod,
    status: "pending_checkout",
    subtotal,
    shipping,
    total,
    currency: "USD",
    items: normalizedItems,
    sessionId: "",
    paymentReference: "",
    gatewayReference: "",
    transactionId: "",
    trackingNumber: "",
    carrier: "",
    estimatedDelivery: null,
    refundAmount: 0,
    refundReason: "",
    cancellationReason: "",
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

export function getAllOrders() {
  return Array.from(orders.values());
}

export function getOrdersByCustomerEmail(email) {
  return Array.from(orders.values()).filter(order => order.customerEmail === email);
}
