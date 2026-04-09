import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    orderId: {
      type: String,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      maxlength: 100
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000
    },
    images: [{
      type: String
    }],
    verifiedPurchase: {
      type: Boolean,
      default: false
    },
    helpful: {
      type: Number,
      default: 0
    },
    helpfulUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    reply: {
      comment: String,
      repliedBy: String,
      repliedAt: Date
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "reported"],
      default: "pending",
      index: true
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

reviewSchema.index({ productId: 1, rating: 1 });
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);

