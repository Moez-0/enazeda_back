import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  phone?: string;
  email?: string;
  name?: string;
  provider: "phone" | "email" | "google";
  isVerified: boolean;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      sparse: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ["phone", "email", "google"],
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ provider: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
