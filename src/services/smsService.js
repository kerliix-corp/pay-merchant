import { client, fromNumber } from "../../config/sms.js";
import logger from "../../config/logger.js";

export async function sendSMS({ to, message }) {
  try {
    const response = await client.messages.create({
      body: message,
      from: fromNumber,
      to,
    });

    logger.info(`SMS sent to ${to}: ${response.sid}`);
    return response;
  } catch (error) {
    logger.error("SMS error:", error);
    throw error;
  }
}

export async function sendOrderConfirmationSMS({ to, orderNumber, storeName, total, trackingLink }) {
  const message = `Order Confirmed! #${orderNumber}\nThank you for shopping with ${storeName}. Your order of $${total} has been received.\nTrack order: ${trackingLink}`;
  return sendSMS({ to, message });
}

export async function sendPaymentConfirmationSMS({ to, orderNumber, amount, paymentMethod }) {
  const message = `Payment Received! Order #${orderNumber}\n$${amount} paid successfully via ${paymentMethod}.\nWe will notify you when your order ships.`;
  return sendSMS({ to, message });
}

export async function sendPaymentFailedSMS({ to, orderNumber, amount, retryLink }) {
  const message = `Payment Failed! Order #${orderNumber}\n$${amount} could not be processed. Please retry payment within 24 hours:\n${retryLink}`;
  return sendSMS({ to, message });
}

export async function sendPaymentCancelledSMS({ to, orderNumber, amount, resumeLink }) {
  const message = `Payment Cancelled! Order #${orderNumber}\nYou cancelled the payment of $${amount}. Resume checkout:\n${resumeLink}`;
  return sendSMS({ to, message });
}

export async function sendOrderShippedSMS({ to, orderNumber, trackingNumber, carrier, estimatedDate, trackingLink }) {
  const message = `Order Shipped! #${orderNumber}\nYour order is on its way.\nTracking #: ${trackingNumber}\nCarrier: ${carrier}\nEstimated delivery: ${estimatedDate}\nTrack: ${trackingLink}`;
  return sendSMS({ to, message });
}

export async function sendOutForDeliverySMS({ to, orderNumber, trackingLink }) {
  const message = `Out for Delivery! Order #${orderNumber}\nYour package is out for delivery today.\nTrack: ${trackingLink}`;
  return sendSMS({ to, message });
}

export async function sendOrderDeliveredSMS({ to, orderNumber, reviewLink }) {
  const message = `Delivered! Order #${orderNumber}\nYour order has been delivered. Thank you for shopping with us.\nLeave a review: ${reviewLink}`;
  return sendSMS({ to, message });
}

export async function sendRefundConfirmationSMS({ to, orderNumber, refundAmount, refundMethod }) {
  const message = `Refund Processed! Order #${orderNumber}\n$${refundAmount} refunded to your ${refundMethod}.\nPlease allow 5-7 business days to reflect.`;
  return sendSMS({ to, message });
}

export async function sendOrderCancelledSMS({ to, orderNumber, reason }) {
  const message = `Order Cancelled! #${orderNumber}\nYour order has been cancelled.\nReason: ${reason}\nContact support for assistance.`;
  return sendSMS({ to, message });
}

export async function sendOrderStatusUpdateSMS({ to, orderNumber, status, statusMessage, trackingLink }) {
  const message = `Order Update! #${orderNumber}\nStatus: ${status}\n${statusMessage}\nTrack: ${trackingLink}`;
  return sendSMS({ to, message });
}

export async function sendLowStockAlertSMS({ to, productName, stockCount, sku }) {
  const message = `Low Stock Alert\nProduct: ${productName}\nRemaining: ${stockCount} units\nSKU: ${sku}\nRestock soon.`;
  return sendSMS({ to, message });
}

export async function sendBackInStockSMS({ to, productName, productLink }) {
  const message = `${productName} is back in stock.\nShop now: ${productLink}`;
  return sendSMS({ to, message });
}

export async function sendPriceDropAlertSMS({ to, productName, newPrice, oldPrice, savings, productLink }) {
  const message = `Price Drop Alert\n${productName} is now $${newPrice} (was $${oldPrice})\nSave ${savings}%\nShop: ${productLink}`;
  return sendSMS({ to, message });
}

export async function sendAbandonedCartSMS({ to, itemCount, total, cartLink }) {
  const message = `You left items in your cart.\n${itemCount} item(s) totaling $${total}\nComplete your purchase: ${cartLink}\nOffer expires in 24 hours.`;
  return sendSMS({ to, message });
}

export async function sendWelcomeSMS({ to, storeName, storeLink }) {
  const message = `Welcome to ${storeName}.\nUse code WELCOME10 for 10% off your first order.\nShop: ${storeLink}`;
  return sendSMS({ to, message });
}

export async function sendOrderReadyPickupSMS({ to, orderNumber, storeLocation }) {
  const message = `Ready for Pickup! Order #${orderNumber}\nYour order is ready at ${storeLocation}.\nBring your ID. Valid for 7 days.`;
  return sendSMS({ to, message });
}

export async function sendDeliveryDelaySMS({ to, orderNumber, delayDays, newDate }) {
  const message = `Delivery Delay Notice! Order #${orderNumber}\nDelayed by ${delayDays} day(s).\nNew estimated delivery: ${newDate}`;
  return sendSMS({ to, message });
}

export async function sendReviewRequestSMS({ to, orderNumber, reviewLink }) {
  const message = `Enjoyed your purchase?\nOrder #${orderNumber}\nLeave a review: ${reviewLink}`;
  return sendSMS({ to, message });
}

export async function sendFlashSaleAlertSMS({ to, saleLink }) {
  const message = `Flash Sale\nUp to 50% off for a limited time.\nShop now: ${saleLink}`;
  return sendSMS({ to, message });
}

export async function sendOrderVerificationSMS({ to, orderNumber, verifyLink }) {
  const message = `Verify your order #${orderNumber}\nClick to confirm: ${verifyLink}\nIf not you, contact support.`;
  return sendSMS({ to, message });
}

