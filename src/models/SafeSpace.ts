import mongoose, { Schema, Document } from "mongoose";

export interface ISafeSpace extends Document {
  name: string;
  type: "cafe" | "pharmacy" | "police" | "hospital" | "other";
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  isOpen: boolean;
  verified: boolean;
  verifiedBy: mongoose.Types.ObjectId[];
  hours?: {
    open: string;
    close: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SafeSpaceSchema = new Schema<ISafeSpace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["cafe", "pharmacy", "police", "hospital", "other"],
      required: true,
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    hours: {
      open: String,
      close: String,
    },
  },
  {
    timestamps: true,
  }
);

SafeSpaceSchema.index({ location: "2dsphere" });
SafeSpaceSchema.index({ verified: 1 });

export const SafeSpace = mongoose.model<ISafeSpace>("SafeSpace", SafeSpaceSchema);
