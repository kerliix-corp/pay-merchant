import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  retailer: { type: String }
});

const shippingAddressSchema = new mongoose.Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  country: { type: String },
  phone: { type: String }
});

const orderSchema = new mongoose.Schema(
  {
    merchantOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    merchantName: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    customerEmail: {
      type: String,
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true
    },
    shippingAddress: shippingAddressSchema,
    paymentMethod: {
      type: String,
      default: "Card"
    },
    status: {
      type: String,
      enum: [
        "pending_checkout",
        "payment_session_created",
        "checkout_creation_failed",
        "paid",
        "payment_failed",
        "payment_cancelled",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "refunded",
        "cancelled"
      ],
      default: "pending_checkout",
      index: true
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true
    },
    items: [orderItemSchema],
    sessionId: {
      type: String,
      index: true
    },
    paymentReference: {
      type: String
    },
    gatewayReference: {
      type: String
    },
    transactionId: {
      type: String,
      index: true
    },
    trackingNumber: {
      type: String
    },
    carrier: {
      type: String
    },
    estimatedDelivery: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundReason: {
      type: String
    },
    refundTransactionId: {
      type: String
    },
    refundedAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    cancelledAt: {
      type: Date
    },
    lastEventId: {
      type: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ customerEmail: 1, status: 1 });
orderSchema.index({ merchantOrderId: 1, status: 1 });

export default mongoose.models.Order || mongoose.model("Order", orderSchema);

