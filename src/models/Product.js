import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    imageUrl: {
      type: String,
      required: true
    },
    galleryImages: [{
      type: String
    }],
    badge: {
      type: String,
      default: "New"
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    retailer: {
      type: String,
      required: true,
      index: true
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    inStock: {
      type: Boolean,
      default: true
    },
    stockCount: {
      type: Number,
      default: 0,
      min: 0
    },
    features: [{
      type: String
    }],
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: "cm" }
    },
    tags: [{
      type: String,
      index: true
    }],
    isActive: {
      type: Boolean,
      default: true,
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

productSchema.index({ category: 1, price: 1 });
productSchema.index({ retailer: 1, price: 1 });
productSchema.index({ name: "text", description: "text" });

export default mongoose.models.Product || mongoose.model("Product", productSchema);
