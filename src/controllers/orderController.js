
import Order from "../models/Order.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import Notification from "../models/Notification.js";
import WebhookEvent from "../models/WebhookEvent.js";
import { isValidSignature } from "../services/webhookSignature.js";
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
const paymentAppUrl = process.env.PAYMENT_APP_URL || "http://localhost:1000";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const kerliixWebhookSecret = process.env.KERLIIX_PAY_WEBHOOK_SECRET || "";

function generateMerchantOrderId() {
  return `mord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function calculateOrderTotals(items, shippingCost = 5.99, taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const shipping = Number(shippingCost);
  const tax = Number((subtotal * taxRate).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  return { subtotal, shipping, tax, total };
}

export const createCheckoutSession = async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const customerEmail = req.body?.customerEmail || "";
  const customerName = req.body?.customerName || "Valued Customer";
  const shippingAddress = req.body?.shippingAddress || {};
  const paymentMethod = req.body?.paymentMethod || "Card";
  const userId = req.body?.userId || null;

  if (!items.length) {
    return res.status(400).json({ error: "At least one item is required." });
  }

  if (!customerEmail) {
    return res.status(400).json({ error: "Customer email is required." });
  }

  const merchantOrderId = generateMerchantOrderId();
  const { subtotal, shipping, tax, total } = calculateOrderTotals(items);

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
    currency: "USD",
    items: items.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      price: item.price,
      quantity: item.quantity,
      retailer: item.retailer
    }))
  });

  await order.save();

  const returnUrl = `${appBaseUrl}/orders/${encodeURIComponent(merchantOrderId)}`;
  const webhookUrl = `${appBaseUrl}/api/payment-webhooks/kerliix-pay`;

  try {
    const response = await fetch(`${paymentAppUrl}/api/pay/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchantName,
        currency: "USD",
        items,
        metadata: { 
          merchantOrderId, 
          merchantWebhookUrl: webhookUrl,
          customerEmail,
          customerName
        },
        returnUrl
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      order.status = "checkout_creation_failed";
      await order.save();
      
      await sendPaymentFailedNotification({
        to: customerEmail,
        orderNumber: merchantOrderId,
        customerName,
        amount: total,
        paymentMethod,
        errorMessage: data.error || "Failed to create payment session",
        retryUrl: `${appBaseUrl}/checkout/${merchantOrderId}`
      });
      
      return res.status(response.status).json({ error: data.error || "Payment session failed." });
    }

    order.status = "payment_session_created";
    order.sessionId = data?.session?.id || "";
    await order.save();

    if (userId) {
      await Cart.findOneAndDelete({ userId });
    }

    return res.status(201).json({
      ok: true,
      merchantOrderId: order.merchantOrderId,
      paymentUrl: data.paymentUrl
    });

  } catch (err) {
    order.status = "checkout_creation_failed";
    await order.save();
    
    await sendPaymentFailedNotification({
      to: customerEmail,
      orderNumber: merchantOrderId,
      customerName,
      amount: total,
      paymentMethod,
      errorMessage: err.message,
      retryUrl: `${appBaseUrl}/checkout/${merchantOrderId}`
    });
    
    return res.status(500).json({ error: err.message });
  }
};

export const getOrderById = async (req, res) => {
  const order = await Order.findOne({ merchantOrderId: req.params.merchantOrderId });

  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
};

export const getOrdersByUser = async (req, res) => {
  const { userId } = req.params;
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });
  return res.json(orders);
};

export const getOrdersByEmail = async (req, res) => {
  const { email } = req.params;
  const orders = await Order.find({ customerEmail: email }).sort({ createdAt: -1 });
  return res.json(orders);
};

export const handleKerliixWebhook = async (req, res) => {
  const signature = req.get("x-kerliix-pay-signature") || "";
  const payload = req.rawBody || JSON.stringify(req.body || {});
  const eventId = req.body?.eventId || "";
  const eventType = req.body?.eventType || "";
  const data = req.body?.data || {};
  const merchantOrderId = data.merchantOrderId || "";

  if (!isValidSignature(payload, kerliixWebhookSecret, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    return res.json({ ok: true, duplicate: true });
  }

  await WebhookEvent.create({
    eventId,
    eventType,
    merchantOrderId,
    payload: req.body,
    signature,
    status: "processed"
  });

  const order = await Order.findOne({ merchantOrderId });
  if (!order) return res.status(404).json({ error: "Order not found" });

  let updatedOrder = order;

  if (eventType === "payment.succeeded" && data.status === "paid") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "paid",
        paymentReference: data.paymentReference,
        gatewayReference: data.gatewayReference,
        transactionId: data.transactionId,
        lastEventId: eventId
      },
      { new: true }
    );
    
    await Notification.create({
      userId: order.userId,
      type: "payment",
      title: "Payment Received",
      message: `Your payment of $${order.total} for order #${order.merchantOrderId} has been received.`,
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
      transactionId: data.transactionId,
      paymentDate: new Date().toISOString()
    });
  }

  if (eventType === "payment.failed") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "payment_failed",
        lastEventId: eventId
      },
      { new: true }
    );
    
    await sendPaymentFailedNotification({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      amount: order.total,
      paymentMethod: order.paymentMethod,
      errorMessage: data.errorMessage || "Payment processing failed",
      retryUrl: `${appBaseUrl}/checkout/${order.merchantOrderId}`
    });
  }

  if (eventType === "payment.cancelled") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "payment_cancelled",
        lastEventId: eventId
      },
      { new: true }
    );
    
    await sendPaymentCancelledNotification({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      amount: order.total,
      reason: data.reason || "User cancelled payment",
      resumeUrl: `${appBaseUrl}/checkout/${order.merchantOrderId}`
    });
  }

  if (eventType === "order.shipped") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "shipped",
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
        estimatedDelivery: data.estimatedDelivery,
        lastEventId: eventId
      },
      { new: true }
    );
    
    await Notification.create({
      userId: order.userId,
      type: "shipping",
      title: "Order Shipped",
      message: `Your order #${order.merchantOrderId} has been shipped!`,
      data: { orderId: order.merchantOrderId, trackingNumber: data.trackingNumber },
      actionUrl: `/orders/${order.merchantOrderId}`
    });
    
    await sendOrderStatusUpdate({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      status: "shipped",
      oldStatus: order.status,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      estimatedDelivery: data.estimatedDelivery
    });
  }

  if (eventType === "order.delivered") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "delivered",
        deliveredAt: new Date(),
        lastEventId: eventId
      },
      { new: true }
    );
    
    await Notification.create({
      userId: order.userId,
      type: "shipping",
      title: "Order Delivered",
      message: `Your order #${order.merchantOrderId} has been delivered.`,
      data: { orderId: order.merchantOrderId },
      actionUrl: `/orders/${order.merchantOrderId}`
    });
    
    await sendOrderStatusUpdate({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      status: "delivered",
      oldStatus: order.status,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDelivery: order.estimatedDelivery
    });
  }

  if (eventType === "refund.processed") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "refunded",
        refundAmount: data.refundAmount,
        refundReason: data.refundReason,
        refundTransactionId: data.refundTransactionId,
        refundedAt: new Date(),
        lastEventId: eventId
      },
      { new: true }
    );
    
    await Notification.create({
      userId: order.userId,
      type: "order",
      title: "Refund Processed",
      message: `A refund of $${data.refundAmount} has been processed for order #${order.merchantOrderId}.`,
      data: { orderId: order.merchantOrderId, refundAmount: data.refundAmount },
      actionUrl: `/orders/${order.merchantOrderId}`
    });
    
    await sendRefundConfirmation({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      refundAmount: data.refundAmount,
      refundMethod: order.paymentMethod,
      refundReason: data.refundReason,
      transactionId: data.refundTransactionId,
      refundDate: new Date().toISOString()
    });
  }

  if (eventType === "order.cancelled") {
    updatedOrder = await Order.findOneAndUpdate(
      { merchantOrderId },
      {
        status: "cancelled",
        cancellationReason: data.reason || "Order cancelled",
        cancelledAt: new Date(),
        lastEventId: eventId
      },
      { new: true }
    );
    
    await sendOrderCancellationEmail({
      to: order.customerEmail,
      orderNumber: order.merchantOrderId,
      customerName: order.customerName,
      cancelledItems: order.items,
      refundAmount: order.total,
      cancellationReason: data.reason || "Requested by customer"
    });
  }

  return res.json({ ok: true, order: updatedOrder });
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
    message: `A refund of $${refundAmount || order.total} has been processed for order #${merchantOrderId}.`,
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

export const getUserOrders = async (req, res) => {
  const { userId } = req.params;
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });
  return res.json(orders);
};

export const getOrderBySessionId = async (req, res) => {
  const { sessionId } = req.params;
  const order = await Order.findOne({ sessionId });
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
};

export const getOrderStats = async (req, res) => {
  const totalOrders = await Order.countDocuments();
  const paidOrders = await Order.countDocuments({ status: "paid" });
  const shippedOrders = await Order.countDocuments({ status: "shipped" });
  const deliveredOrders = await Order.countDocuments({ status: "delivered" });
  const cancelledOrders = await Order.countDocuments({ status: "cancelled" });
  const refundedOrders = await Order.countDocuments({ status: "refunded" });
  
  const revenue = await Order.aggregate([
    { $match: { status: { $in: ["paid", "shipped", "delivered"] } } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  
  res.json({
    totalOrders,
    paidOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    refundedOrders,
    totalRevenue: revenue[0]?.total || 0
  });
};

export const healthCheck = (req, res) => {
  res.json({ ok: true, service: "merchant", timestamp: new Date().toISOString() });
};


