import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    ssoId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    fullName: {
      type: String,
      default: ""
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    lastLoginAt: {
      type: Date
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

export default mongoose.models.User || mongoose.model("User", userSchema);
