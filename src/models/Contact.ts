import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  type: "emergency" | "guardian";
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ["emergency", "guardian"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ContactSchema.index({ userId: 1, type: 1 });

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);
