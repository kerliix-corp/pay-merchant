
import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    merchantOrderId: {
      type: String,
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    signature: {
      type: String
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["pending", "processed", "failed", "duplicate"],
      default: "pending",
      index: true
    },
    error: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

webhookEventSchema.index({ createdAt: -1 });
webhookEventSchema.index({ eventType: 1, status: 1 });

export default mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);

