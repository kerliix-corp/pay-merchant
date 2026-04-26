import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Notification from "../models/Notification.js";
import WebhookEvent from "../models/WebhookEvent.js";
import { convertUsdToUgx } from "../utils/viewHelpers.js";
import { getSeerbitClientConfig, initiateMobileMoney, verifyPayment } from "../services/seerbitService.js";
import {
  sendOrderConfirmation,
  sendPaymentConfirmation,
  sendOrderStatusUpdate,
  sendPaymentFailedNotification,
  sendPaymentCancelledNotification,
  sendRefundConfirmation,
  sendOrderCancellationEmail
} from "../services/emailService.js";

const merchantName = process.env.MERCHANT_NAME || "Kerliix Merchant";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const seerbitCountry = process.env.SEERBIT_COUNTRY || "UG";

function generateMerchantOrderId() {
  return `mord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function parseRetailerSettlementConfig() {
  try {
    return JSON.parse(process.env.RETAILER_SETTLEMENT_CONFIG || "{}");
  } catch {
    return {};
  }
}

function normalizeItemsToUgx(items = []) {
  return items.map((item) => ({
    ...item,
    price: Math.round(convertUsdToUgx(item.price || 0))
  }));
}

function getCommissionRate(total) {
  if (total >= 500000) return 0.005;
  if (total >= 250000) return 0.01;
  if (total >= 100000) return 0.015;
  return 0.02;
}

function buildSplitMetadata(items, total) {
  const retailerConfig = parseRetailerSettlementConfig();
  const commissionRate = getCommissionRate(total);
  const commissionAmount = Math.round(total * commissionRate);
  const groupedRetailers = items.reduce((acc, item) => {
    const key = item.retailer || "Direct";
    acc[key] = (acc[key] || 0) + (Number(item.price || 0) * Number(item.quantity || 0));
    return acc;
  }, {});

  const allocations = Object.entries(groupedRetailers).map(([retailerName, grossAmount]) => {
    const config = retailerConfig[retailerName] || {};
    const shareRatio = grossAmount / Math.max(total || 1, 1);
    const commissionShare = Math.round(commissionAmount * shareRatio);
    const retailerAmount = Math.max(0, grossAmount - commissionShare);

    return {
      retailerName,
      grossAmount,
      commissionShare,
      retailerAmount,
      settlementMethod: config.settlementMethod || "manual_review",
      subAccountCode: config.subAccountCode || "",
      status: config.subAccountCode ? "ready_for_split" : "missing_subaccount"
    };
  });

  const splitItems = allocations
    .filter((allocation) => allocation.subAccountCode)
    .map((allocation) => ({
      subAccountCode: allocation.subAccountCode,
      value: allocation.retailerAmount.toFixed(2)
    }));

  return {
    commissionRate,
    commissionAmount,
    allocations,
    seerbit: splitItems.length
      ? {
          type: "FLAT",
          transactionFee: "PARENT_ACCOUNT",
          items: splitItems
        }
      : null
  };
}

function calculateOrderTotals(items, shippingCost = 0, taxRate = 0) {
  const normalizedItems = normalizeItemsToUgx(items);
  const subtotal = normalizedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const shipping = Math.round(Number(shippingCost || 0));
  const tax = Math.round(subtotal * Number(taxRate || 0));
  const total = subtotal + shipping + tax;
  return { normalizedItems, subtotal, shipping, tax, total };
}

function buildOrderItems(items) {
  return items.map((item) => ({
    id: item.id,
    sku: item.sku || item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
    retailer: item.retailer
  }));
}

async function markOrderAsPaid(order, verification) {
  if (!order) {
    return null;
  }

  const payment = verification?.data?.payments || {};
  const updatedOrder = await Order.findOneAndUpdate(
    { merchantOrderId: order.merchantOrderId },
    {
      status: "paid",
      paymentReference: payment.paymentReference || order.paymentReference || order.merchantOrderId,
      gatewayReference: payment.gatewayref || payment.gatewayReference || "",
      transactionId: payment.linkingReference || payment.gatewayref || "",
      "metadata.seerbit.verification": verification?.data || {}
    },
    { new: true }
  );

  await Notification.create({
    userId: order.userId,
    type: "payment",
    title: "Payment Received",
    message: `Your payment for order #${order.merchantOrderId} has been received.`,
    data: { orderId: order.merchantOrderId },
    actionUrl: `/orders/${order.merchantOrderId}`
  });

  await sendOrderConfirmation({
    to: order.customerEmail,
    orderNumber: order.merchantOrderId,
    customerName: order.customerName,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod
  });

  await sendPaymentConfirmation({
    to: order.customerEmail,
    orderNumber: order.merchantOrderId,
    customerName: order.customerName,
    amount: order.total,
    paymentMethod: order.paymentMethod,
    transactionId: payment.gatewayref || payment.linkingReference || order.merchantOrderId,
    paymentDate: payment.transactionProcessedTime || new Date().toISOString()
  });

  return updatedOrder;
}

function getWebhookAck(req) {
  const expectedAckReference = req.get("X-Expected-Ack-Reference") || "";
  return {
    ackReference: expectedAckReference || `ack_${Date.now().toString(36)}`,
    status: "received"
  };
}

export const createCheckoutSession = async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const customerEmail = req.body?.customerEmail || "";
  const customerName = req.body?.customerName || "Valued Customer";
  const shippingAddress = req.body?.shippingAddress || {};
  const paymentMethod = req.body?.paymentMethod || "card";
  const userId = req.body?.userId || null;
  const shippingCost = Number(req.body?.shippingCost || 0);

  if (!items.length) {
    return res.status(400).json({ error: "At least one item is required." });
  }

  if (!customerEmail) {
    return res.status(400).json({ error: "Customer email is required." });
  }

  const merchantOrderId = generateMerchantOrderId();
  const { normalizedItems, subtotal, shipping, tax, total } = calculateOrderTotals(items, shippingCost);
  const split = buildSplitMetadata(normalizedItems, total);

  const order = new Order({
    merchantOrderId,
    merchantName,
    userId,
    customerEmail,
    customerName,
    shippingAddress,
    paymentMethod,
    status: "pending_checkout",
    subtotal,
    shipping,
    tax,
    total,
    currency: "UGX",
    items: buildOrderItems(normalizedItems),
    paymentReference: merchantOrderId,
    metadata: {
      deliveryNotes: req.body?.deliveryNotes || "",
      deliveryOption: req.body?.deliveryOption || "standard",
      split,
      seerbit: {
        country: seerbitCountry,
        paymentChannel: paymentMethod
      }
    }
  });

  await order.save();

  if (userId) {
    await Cart.findOneAndDelete({ userId });
  }

  return res.status(201).json({
    ok: true,
    merchantOrderId,
    checkoutUrl: `/checkout/${merchantOrderId}`
  });
};

export const startMobileMoneyPayment = async (req, res) => {
  const order = await Order.findOne({ merchantOrderId: req.params.merchantOrderId });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const network = String(req.body?.network || "").toUpperCase();
  const mobileNumber = String(req.body?.mobileNumber || order.shippingAddress?.phone || "").trim();

  if (!["MTN", "AIRTEL"].includes(network)) {
    return res.status(400).json({ error: "Select MTN or Airtel." });
  }

  if (!mobileNumber) {
    return res.status(400).json({ error: "Mobile money number is required." });
  }

  try {
    const result = await initiateMobileMoney({
      amount: order.total.toFixed(2),
      email: order.customerEmail,
      fullName: order.customerName,
      mobileNumber,
      paymentReference: order.paymentReference || order.merchantOrderId,
      productDescription: `Order ${order.merchantOrderId}`,
      network
    });

    order.status = "payment_session_created";
    order.paymentMethod = network.toLowerCase();
    order.metadata = {
      ...(order.metadata || {}),
      seerbit: {
        ...(order.metadata?.seerbit || {}),
        network,
        initiation: result?.data || {}
      }
    };
    await order.save();

    return res.json({
      ok: true,
      code: result?.data?.code || "",
      message: result?.data?.message || "Payment prompt sent.",
      linkingReference: result?.data?.payments?.linkingReference || ""
    });
  } catch (error) {
    order.status = "payment_failed";
    await order.save();

    await sendPaymentFailedNotification({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      amount: order.total,
      paymentMethod: network,
      errorMessage: error.message,
      retryUrl: `${appBaseUrl}/checkout/${order.merchantOrderId}`
    });

    return res.status(500).json({ error: error.message });
  }
};

export const verifyOrderPayment = async (req, res) => {
  const order = await Order.findOne({ merchantOrderId: req.params.merchantOrderId });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  try {
    const paymentReference = req.body?.paymentReference || req.query?.paymentReference || order.paymentReference || order.merchantOrderId;
    const verification = await verifyPayment(paymentReference);
    const payment = verification?.data?.payments || {};
    const isPaid = payment?.gatewayCode === "00" || /successful/i.test(payment?.reason || "") || /successful/i.test(payment?.gatewayMessage || "");

    if (isPaid) {
      const updatedOrder = await markOrderAsPaid(order, verification);
      return res.json({ ok: true, paid: true, order: updatedOrder, verification });
    }

    const pendingOrder = await Order.findOneAndUpdate(
      { merchantOrderId: order.merchantOrderId },
      {
        status: payment?.code === "INP" ? "payment_session_created" : "payment_failed",
        "metadata.seerbit.verification": verification?.data || {}
      },
      { new: true }
    );

    return res.json({
      ok: true,
      paid: false,
      status: pendingOrder.status,
      verification
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  const order = await Order.findOne({ merchantOrderId: req.params.merchantOrderId });

  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
};

export const handleKerliixWebhook = async (req, res) => {
  const ack = getWebhookAck(req);
  const body = req.body || {};
  const notificationItems = Array.isArray(body.notificationItems) ? body.notificationItems : [];

  if (!notificationItems.length) {
    return res.status(200).json(ack);
  }

  for (const entry of notificationItems) {
    const notification = entry?.notificationRequestItem || {};
    const eventId = notification.eventId || "";
    const eventType = notification.eventType || "";
    const data = notification.data || {};
    const merchantOrderId = data.reference || data.paymentReference || data.transactionRef || "";

    const exists = await WebhookEvent.findOne({ eventId });
    if (exists) {
      continue;
    }

    await WebhookEvent.create({
      eventId,
      eventType,
      merchantOrderId,
      payload: notification,
      signature: req.get("X-Expected-Ack-Reference") || "",
      status: "processed"
    });

    if (eventType === "transaction" && merchantOrderId) {
      const order = await Order.findOne({ merchantOrderId });
      if (order && (data.gatewayCode === "00" || /successful/i.test(data.reason || ""))) {
        await markOrderAsPaid(order, { data: { payments: data } });
      }
    }
  }

  return res.status(200).json(ack);
};

export const updateOrderStatus = async (req, res) => {
  const { merchantOrderId } = req.params;
  const { status, trackingNumber, carrier, estimatedDelivery } = req.body;

  const order = await Order.findOne({ merchantOrderId });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const oldStatus = order.status;

  const updatedOrder = await Order.findOneAndUpdate(
    { merchantOrderId },
    {
      status,
      trackingNumber: trackingNumber || order.trackingNumber,
      carrier: carrier || order.carrier,
      estimatedDelivery: estimatedDelivery || order.estimatedDelivery
    },
    { new: true }
  );

  if (status !== oldStatus && (status === "shipped" || status === "delivered")) {
    await Notification.create({
      userId: order.userId,
      type: "shipping",
      title: status === "shipped" ? "Order Shipped" : "Order Delivered",
      message: status === "shipped"
        ? `Your order #${merchantOrderId} has been shipped!`
        : `Your order #${merchantOrderId} has been delivered.`,
      data: { orderId: merchantOrderId, trackingNumber },
      actionUrl: `/orders/${merchantOrderId}`
    });

    await sendOrderStatusUpdate({
      to: order.customerEmail,
      orderNumber: merchantOrderId,
      customerName: order.customerName,
      status,
      oldStatus,
      trackingNumber: trackingNumber || order.trackingNumber,
      carrier: carrier || order.carrier,
      estimatedDelivery: estimatedDelivery || order.estimatedDelivery
    });
  }

  return res.json({ ok: true, order: updatedOrder });
};

export const processRefund = async (req, res) => {
  const { merchantOrderId } = req.params;
  const { refundAmount, refundReason } = req.body;

  const order = await Order.findOne({ merchantOrderId });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status !== "paid" && order.status !== "shipped") {
    return res.status(400).json({ error: "Order cannot be refunded" });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { merchantOrderId },
    {
      status: "refunded",
      refundAmount: refundAmount || order.total,
      refundReason: refundReason || "Customer request",
      refundedAt: new Date()
    },
    { new: true }
  );

  await Notification.create({
    userId: order.userId,
    type: "order",
    title: "Refund Processed",
    message: `A refund of ${refundAmount || order.total} has been processed for order #${merchantOrderId}.`,
    data: { orderId: merchantOrderId, refundAmount: refundAmount || order.total },
    actionUrl: `/orders/${merchantOrderId}`
  });

  await sendRefundConfirmation({
    to: order.customerEmail,
    orderNumber: merchantOrderId,
    customerName: order.customerName,
    refundAmount: refundAmount || order.total,
    refundMethod: order.paymentMethod,
    refundReason: refundReason || "Customer request",
    transactionId: order.transactionId,
    refundDate: new Date().toISOString()
  });

  return res.json({ ok: true, order: updatedOrder });
};

export const cancelOrder = async (req, res) => {
  const { merchantOrderId } = req.params;
  const { cancellationReason } = req.body;

  const order = await Order.findOne({ merchantOrderId });
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status !== "pending_checkout" && order.status !== "payment_session_created") {
    return res.status(400).json({ error: "Order cannot be cancelled" });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { merchantOrderId },
    {
      status: "cancelled",
      cancellationReason: cancellationReason || "Cancelled by customer",
      cancelledAt: new Date()
    },
    { new: true }
  );

  await sendOrderCancellationEmail({
    to: order.customerEmail,
    orderNumber: merchantOrderId,
    customerName: order.customerName,
    cancelledItems: order.items,
    refundAmount: 0,
    cancellationReason: cancellationReason || "Requested by customer"
  });

  return res.json({ ok: true, order: updatedOrder });
};

export const getSeerbitConfig = (req, res) => {
  return res.json({
    ok: true,
    config: getSeerbitClientConfig()
  });
};

export const healthCheck = (req, res) => {
  res.json({ ok: true, service: "merchant", timestamp: new Date().toISOString() });
};
