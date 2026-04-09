
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  imageUrl: {
    type: String
  },
  retailer: {
    type: String
  },
  inStock: {
    type: Boolean,
    default: true
  },
  maxStock: {
    type: Number,
    default: 0
  }
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    items: [cartItemSchema],
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    itemCount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: { expires: 0 }
    }
  },
  {
    timestamps: true
  }
);

cartSchema.pre("save", function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.total = this.subtotal;
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

export default mongoose.models.Cart || mongoose.model("Cart", cartSchema);
