import transporter from "../../config/mail.js";

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email error:", error.message);
    throw error;
  }
};

export const sendOrderConfirmation = async ({ to, orderNumber, customerName, items, subtotal, shipping, total, shippingAddress, paymentMethod }) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
        <img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
        <strong>${item.name}</strong><br>
        SKU: ${item.sku}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d2693c, #a44726); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        .total-row { font-weight: bold; font-size: 1.1em; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #d2693c; color: white; text-decoration: none; border-radius: 999px; margin-top: 20px; }
        .status { display: inline-block; padding: 6px 12px; background: #28a745; color: white; border-radius: 999px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed! 🎉</h1>
          <p>Thank you for your purchase</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Your order has been successfully placed and is being processed.</p>
          
          <div class="order-details">
            <h3>Order #${orderNumber}</h3>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Status:</strong> <span class="status">Confirmed</span></p>
            
            <h4>Items Ordered:</h4>
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr><td colspan="4" style="text-align: right; padding: 8px;"><strong>Subtotal:</strong></td><td style="text-align: right;">$${subtotal.toFixed(2)}</td></tr>
                <tr><td colspan="4" style="text-align: right; padding: 8px;"><strong>Shipping:</strong></td><td style="text-align: right;">$${shipping.toFixed(2)}</td></tr>
                <tr class="total-row"><td colspan="4" style="text-align: right; padding: 8px;"><strong>Total:</strong></td><td style="text-align: right;">$${total.toFixed(2)}</td></tr>
              </tfoot>
            </table>
            
            <h4>Shipping Address:</h4>
            <p>${shippingAddress.street}<br>${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>${shippingAddress.country}</p>
          </div>
          
          <p>We'll notify you once your order ships. You can track your order status in your account dashboard.</p>
          
          <a href="${process.env.APP_URL}/orders/${orderNumber}" class="button">View Order Details</a>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Order Confirmation #${orderNumber}\n\nDear ${customerName},\n\nYour order has been successfully placed.\n\nOrder #: ${orderNumber}\nTotal: $${total.toFixed(2)}\n\nThank you for shopping with us!`;

  return await sendEmail({ to, subject: `Order Confirmation #${orderNumber}`, html, text });
};

export const sendPaymentConfirmation = async ({ to, orderNumber, customerName, amount, paymentMethod, transactionId, paymentDate }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Confirmation #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745, #1f6b52); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Received! 💰</h1>
          <p>Your payment has been confirmed</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We have successfully received your payment for order #${orderNumber}.</p>
          
          <div class="payment-details">
            <h3>Payment Details:</h3>
            <p><strong>Amount Paid:</strong> $${amount.toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Payment Date:</strong> ${paymentDate || new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: #28a745;">Completed ✓</span></p>
          </div>
          
          <p>Your order is now being processed for shipping. You will receive another notification when your order ships.</p>
        </div>
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;

  const text = `Payment Confirmation\n\nDear ${customerName},\n\nWe have received your payment of $${amount.toFixed(2)} for order #${orderNumber}.\n\nTransaction ID: ${transactionId}\n\nThank you!`;

  return await sendEmail({ to, subject: `Payment Confirmation #${orderNumber}`, html, text });
};

export const sendOrderStatusUpdate = async ({ to, orderNumber, customerName, status, oldStatus, trackingNumber, carrier, estimatedDelivery }) => {
  const statusMessages = {
    processing: "We are processing your order.",
    confirmed: "Your order has been confirmed.",
    shipped: "Your order has been shipped!",
    out_for_delivery: "Your order is out for delivery!",
    delivered: "Your order has been delivered.",
    cancelled: "Your order has been cancelled."
  };

  const statusIcons = {
    processing: "🔄",
    confirmed: "✅",
    shipped: "📦",
    out_for_delivery: "🚚",
    delivered: "🏠",
    cancelled: "❌"
  };

  const trackingHtml = trackingNumber ? `
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4>Tracking Information:</h4>
      <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      <p><strong>Carrier:</strong> ${carrier || 'Standard Shipping'}</p>
      ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(estimatedDelivery).toLocaleDateString()}</p>` : ''}
      <a href="${process.env.TRACKING_URL_PREFIX || 'https://www.google.com/search?q=track+package'}/${trackingNumber}" style="display: inline-block; padding: 8px 16px; background: #d2693c; color: white; text-decoration: none; border-radius: 999px; margin-top: 10px;">Track Package →</a>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Order Status Update #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d2693c, #a44726); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .status-update { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status-badge { display: inline-block; padding: 8px 16px; background: #d2693c; color: white; border-radius: 999px; font-weight: bold; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusIcons[status] || '📋'} Order Status Update</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Your order #${orderNumber} status has been updated.</p>
          
          <div class="status-update">
            <p><strong>Previous Status:</strong> ${oldStatus || 'Pending'}</p>
            <p><strong>Current Status:</strong> <span class="status-badge">${status.toUpperCase()}</span></p>
            <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
          </div>
          
          ${trackingHtml}
          
          <p>If you have any questions about your order, please contact our customer support.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;

  const text = `Order Status Update #${orderNumber}\n\nDear ${customerName},\n\nYour order status has been updated to: ${status.toUpperCase()}\n\n${statusMessages[status]}`;

  return await sendEmail({ to, subject: `Order Status Update #${orderNumber} - ${status.toUpperCase()}`, html, text });
};

export const sendPaymentFailedNotification = async ({ to, orderNumber, customerName, amount, paymentMethod, errorMessage, retryUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Failed #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .error-details { background: #fff5f5; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #d2693c; color: white; text-decoration: none; border-radius: 999px; margin-top: 20px; }
        .button-secondary { display: inline-block; padding: 12px 24px; background: #6c757d; color: white; text-decoration: none; border-radius: 999px; margin-top: 20px; margin-left: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Payment Failed</h1>
          <p>We couldn't process your payment</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We were unable to process your payment for order #${orderNumber}.</p>
          
          <div class="error-details">
            <h3>Payment Details:</h3>
            <p><strong>Amount Attempted:</strong> $${amount.toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Error:</strong> ${errorMessage || 'Payment processing failed. Please check your payment method and try again.'}</p>
          </div>
          
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>Verify your payment information is correct</li>
            <li>Check if you have sufficient funds</li>
            <li>Try a different payment method</li>
            <li>Contact your bank if the issue persists</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${retryUrl || `${process.env.APP_URL}/checkout/${orderNumber}`}" class="button">Retry Payment</a>
            <a href="${process.env.APP_URL}/contact" class="button-secondary">Contact Support</a>
          </div>
          
          <p style="margin-top: 20px;">Your order has been saved and will be available for 24 hours to complete payment.</p>
        </div>
        <div class="footer">
          <p>Need help? Contact our support team.</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;

  const text = `Payment Failed #${orderNumber}\n\nDear ${customerName},\n\nWe were unable to process your payment of $${amount.toFixed(2)}.\n\nError: ${errorMessage}\n\nPlease retry payment or contact support.`;

  return await sendEmail({ to, subject: `Payment Failed #${orderNumber} - Action Required`, html, text });
};

export const sendPaymentCancelledNotification = async ({ to, orderNumber, customerName, amount, reason, resumeUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Cancelled #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffc107, #ff9800); color: #333; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .info-box { background: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #d2693c; color: white; text-decoration: none; border-radius: 999px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔄 Payment Cancelled</h1>
          <p>You cancelled the payment process</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>You have cancelled the payment for order #${orderNumber}.</p>
          
          <div class="info-box">
            <h3>Cancellation Details:</h3>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Your order has been saved and you can resume checkout at any time within the next 24 hours.</p>
          
          <div style="text-align: center;">
            <a href="${resumeUrl || `${process.env.APP_URL}/checkout/${orderNumber}`}" class="button">Resume Checkout</a>
          </div>
          
          <p style="margin-top: 20px;">If you didn't intend to cancel this payment, please contact us immediately.</p>
        </div>
        <div class="footer">
          <p>Questions? We're here to help.</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;

  const text = `Payment Cancelled #${orderNumber}\n\nDear ${customerName},\n\nYou cancelled the payment of $${amount.toFixed(2)} for order #${orderNumber}.\n\nYou can resume checkout anytime.`;

  return await sendEmail({ to, subject: `Payment Cancelled #${orderNumber}`, html, text });
};

export const sendRefundConfirmation = async ({ to, orderNumber, customerName, refundAmount, refundMethod, refundReason, transactionId, refundDate }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Refund Confirmation #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #17a2b8, #138496); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .refund-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Refund Processed</h1>
          <p>Your refund has been confirmed</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We have processed your refund for order #${orderNumber}.</p>
          
          <div class="refund-details">
            <h3>Refund Details:</h3>
            <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
            <p><strong>Refund Method:</strong> ${refundMethod}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Refund Date:</strong> ${refundDate || new Date().toLocaleString()}</p>
            ${refundReason ? `<p><strong>Reason:</strong> ${refundReason}</p>` : ''}
            <p><strong>Status:</strong> <span style="color: #28a745;">Completed ✓</span></p>
          </div>
          
          <p>Please allow 3-7 business days for the refund to appear in your account depending on your bank/payment provider.</p>
          
          <p>If you have any questions about this refund, please contact our customer support team.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;

  const text = `Refund Confirmation #${orderNumber}\n\nDear ${customerName},\n\nYour refund of $${refundAmount.toFixed(2)} for order #${orderNumber} has been processed.\n\nRefund Method: ${refundMethod}\nTransaction ID: ${transactionId}\n\nPlease allow 3-7 business days for the refund to appear.`;

  return await sendEmail({ to, subject: `Refund Confirmation #${orderNumber}`, html, text });
};

export const sendOrderCancellationEmail = async ({ to, orderNumber, customerName, cancelledItems, refundAmount, cancellationReason }) => {
  const itemsHtml = cancelledItems.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Order Cancelled #${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6c757d, #495057); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #fffaf2; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
        .cancellation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #d2693c; color: white; text-decoration: none; border-radius: 999px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Order Cancelled</h1>
          <p>Your order has been cancelled</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We have cancelled your order #${orderNumber} as requested.</p>
          
          <div class="cancellation-details">
            <h3>Cancellation Details:</h3>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Cancellation Reason:</strong> ${cancellationReason || 'Requested by customer'}</p>
            <p><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
            
            ${refundAmount > 0 ? `<p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>` : ''}
            
            <h4>Cancelled Items:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          
          ${refundAmount > 0 ? `<p>A refund of $${refundAmount.toFixed(2)} has been initiated and will reflect in your account within 5-7 business days.</p>` : ''}
          
          <p>We hope to serve you again in the future. If you have any questions, please don't hesitate to contact us.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.APP_URL}/shop" class="button">Continue Shopping</a>
          </div>
        </div>
        <div class="footer">
          <p>We're sorry to see you go!</p>
          <p>&copy; ${new Date().getFullYear()} ${process.env.STORE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;

  const text = `Order Cancelled #${orderNumber}\n\nDear ${customerName},\n\nYour order #${orderNumber} has been cancelled.\n\nReason: ${cancellationReason || 'Requested by customer'}\n${refundAmount > 0 ? `Refund Amount: $${refundAmount.toFixed(2)}` : ''}\n\nWe hope to serve you again.`;

  return await sendEmail({ to, subject: `Order Cancelled #${orderNumber}`, html, text });
};
