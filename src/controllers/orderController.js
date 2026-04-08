import {
  createOrder,
  getOrder,
  updateOrder,
  markWebhookEventProcessed
} from "../services/orderStore.js";
import { isValidSignature } from "../services/webhookSignature.js";

const merchantName = process.env.MERCHANT_NAME || "Kerliix Merchant";
const paymentAppUrl = process.env.PAYMENT_APP_URL || "http://localhost:1000";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const kerliixWebhookSecret = process.env.KERLIIX_PAY_WEBHOOK_SECRET || "";

export const createCheckoutSession = async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!items.length) {
    return res.status(400).json({ error: "At least one item is required." });
  }

  const order = createOrder({ items, merchantName });

  const returnUrl = `${appBaseUrl}/orders/${encodeURIComponent(order.merchantOrderId)}`;
  const webhookUrl = `${appBaseUrl}/api/payment-webhooks/kerliix-pay`;

  try {
    const response = await fetch(`${paymentAppUrl}/api/pay/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchantName,
        currency: "USD",
        items,
        metadata: { merchantOrderId: order.merchantOrderId, merchantWebhookUrl: webhookUrl },
        returnUrl
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      updateOrder(order.merchantOrderId, { status: "checkout_creation_failed" });
      return res.status(response.status).json({ error: data.error || "Payment session failed." });
    }

    const updatedOrder = updateOrder(order.merchantOrderId, {
      status: "payment_session_created",
      sessionId: data?.session?.id || ""
    });

    return res.status(201).json({
      ok: true,
      merchantOrderId: updatedOrder.merchantOrderId,
      paymentUrl: data.paymentUrl
    });

  } catch (err) {
    updateOrder(order.merchantOrderId, { status: "checkout_creation_failed" });
    return res.status(500).json({ error: err.message });
  }
};

export const getOrderById = (req, res) => {
  const order = getOrder(req.params.merchantOrderId);

  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
};

export const handleKerliixWebhook = (req, res) => {
  const signature = req.get("x-kerliix-pay-signature") || "";
  const payload = req.rawBody || JSON.stringify(req.body || {});
  const eventId = req.body?.eventId || "";
  const data = req.body?.data || {};
  const merchantOrderId = data.merchantOrderId || "";

  if (!isValidSignature(payload, kerliixWebhookSecret, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  if (!markWebhookEventProcessed(eventId)) {
    return res.json({ ok: true, duplicate: true });
  }

  const order = getOrder(merchantOrderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const updatedOrder = updateOrder(merchantOrderId, {
    status: data.status || order.status,
    sessionId: data.sessionId || order.sessionId,
    paymentReference: data.paymentReference || order.paymentReference,
    gatewayReference: data.gatewayReference || order.gatewayReference,
    lastEventId: eventId
  });

  return res.json({ ok: true, order: updatedOrder });
};

export const healthCheck = (req, res) => {
  res.json({ ok: true, service: "merchant", timestamp: new Date().toISOString() });
};

