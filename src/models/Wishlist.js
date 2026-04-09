
import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema({
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
    required: true
  },
  imageUrl: {
    type: String
  },
  retailer: {
    type: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notifyWhenInStock: {
    type: Boolean,
    default: false
  }
});

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    items: [wishlistItemSchema],
    itemCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

wishlistSchema.pre("save", function(next) {
  this.itemCount = this.items.length;
  next();
});

export default mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);

