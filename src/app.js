import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { products } from "./data/catalog.js";
import {
  createOrder,
  getOrder,
  markWebhookEventProcessed,
  updateOrder
} from "./services/orderStore.js";
import { isValidSignature } from "./services/webhookSignature.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const app = express();
const merchantName = process.env.MERCHANT_NAME || "Kerliix Merchant";
const paymentAppUrl = process.env.PAYMENT_APP_URL || "http://localhost:1000";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const kerliixWebhookSecret = process.env.KERLIIX_PAY_WEBHOOK_SECRET || "";

app.set("view engine", "ejs");
app.set("views", path.join(projectRoot, "views"));

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString("utf8");
  }
}));

app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[merchant] ${req.method} ${req.originalUrl} started`);

  res.on("finish", () => {
    console.log(
      `[merchant] ${req.method} ${req.originalUrl} completed ${res.statusCode} in ${Date.now() - startedAt}ms`
    );
  });

  next();
});

app.use(express.static(path.join(projectRoot, "public")));

function getViewModel() {
  return {
    merchantName,
    paymentAppUrl,
    appBaseUrl,
    products
  };
}

function summarizeOrder(order) {
  return order ? {
    merchantOrderId: order.merchantOrderId,
    status: order.status,
    total: order.total,
    sessionId: order.sessionId,
    paymentReference: order.paymentReference,
    gatewayReference: order.gatewayReference,
    lastEventId: order.lastEventId
  } : null;
}

app.get("/", (req, res) => {
  res.render("store/index", {
    ...getViewModel(),
    title: `${merchantName} | Items`
  });
});

app.get("/cart", (req, res) => {
  res.render("store/cart", {
    ...getViewModel(),
    title: `${merchantName} | Cart`
  });
});

app.get("/orders/:merchantOrderId", (req, res) => {
  const order = getOrder(req.params.merchantOrderId);

  if (!order) {
    return res.status(404).render("store/order-status", {
      ...getViewModel(),
      title: `${merchantName} | Order not found`,
      order: null
    });
  }

  return res.render("store/order-status", {
    ...getViewModel(),
    title: `${merchantName} | Order ${order.merchantOrderId}`,
    order
  });
});

app.post("/api/checkout-sessions", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!items.length) {
    return res.status(400).json({
      error: "At least one item is required to create a checkout session."
    });
  }

  const order = createOrder({
    items,
    merchantName
  });

  const returnUrl = `${appBaseUrl}/orders/${encodeURIComponent(order.merchantOrderId)}`;
  const webhookUrl = `${appBaseUrl}/api/payment-webhooks/kerliix-pay`;
  console.log("[merchant] checkout_session_created", summarizeOrder(order));

  try {
    const response = await fetch(`${paymentAppUrl}/api/pay/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchant: merchantName,
        currency: "USD",
        items,
        metadata: {
          source: "merchant-cart",
          merchantOrderId: order.merchantOrderId,
          merchantWebhookUrl: webhookUrl
        },
        returnUrl
      })
    });

    const data = await response.json().catch(() => ({}));
    console.log("[merchant] checkout_session_payment_response", {
      ok: response.ok,
      status: response.status,
      merchantOrderId: order.merchantOrderId,
      sessionId: data?.session?.id
    });

    if (!response.ok) {
      updateOrder(order.merchantOrderId, {
        status: "checkout_creation_failed"
      });

      return res.status(response.status).json({
        error: data.error || "Payment session could not be created."
      });
    }

    const updatedOrder = updateOrder(order.merchantOrderId, {
      status: "payment_session_created",
      sessionId: data?.session?.id || ""
    });

    return res.status(201).json({
      ok: true,
      merchantOrderId: updatedOrder.merchantOrderId,
      paymentUrl: data.paymentUrl,
      orderStatusUrl: `${appBaseUrl}/orders/${encodeURIComponent(updatedOrder.merchantOrderId)}`
    });
  } catch (error) {
    console.log("[merchant] checkout_session_exception", {
      merchantOrderId: order.merchantOrderId,
      message: error.message
    });

    updateOrder(order.merchantOrderId, {
      status: "checkout_creation_failed"
    });

    return res.status(500).json({
      error: error.message || "Payment session could not be created."
    });
  }
});

app.get("/api/orders/:merchantOrderId", (req, res) => {
  const order = getOrder(req.params.merchantOrderId);

  if (!order) {
    return res.status(404).json({
      error: "Order not found"
    });
  }

  return res.json(order);
});

app.post("/api/payment-webhooks/kerliix-pay", (req, res) => {
  const signature = req.get("x-kerliix-pay-signature") || "";
  const payload = req.rawBody || JSON.stringify(req.body || {});
  const eventId = req.body?.eventId || "";
  const eventData = req.body?.data || {};
  const merchantOrderId = eventData.merchantOrderId || "";

  console.log("[merchant] payment_webhook_received", {
    eventId,
    merchantOrderId,
    signaturePresent: Boolean(signature),
    status: eventData.status
  });

  if (!isValidSignature(payload, kerliixWebhookSecret, signature)) {
    console.log("[merchant] payment_webhook_invalid_signature", {
      eventId,
      merchantOrderId
    });

    return res.status(401).json({
      error: "Invalid webhook signature"
    });
  }

  if (!markWebhookEventProcessed(eventId)) {
    return res.status(200).json({
      ok: true,
      duplicate: true
    });
  }

  const order = getOrder(merchantOrderId);

  if (!order) {
    console.log("[merchant] payment_webhook_missing_order", {
      eventId,
      merchantOrderId
    });

    return res.status(404).json({
      error: "Order not found"
    });
  }

  const updatedOrder = updateOrder(merchantOrderId, {
    status: eventData.status || order.status,
    sessionId: eventData.sessionId || order.sessionId,
    paymentReference: eventData.paymentReference || order.paymentReference,
    gatewayReference: eventData.gatewayReference || order.gatewayReference,
    lastEventId: eventId
  });

  console.log("[merchant] payment_webhook_applied", summarizeOrder(updatedOrder));

  return res.status(200).json({
    ok: true,
    order: updatedOrder
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "merchant",
    timestamp: new Date().toISOString()
  });
});

export default app;
