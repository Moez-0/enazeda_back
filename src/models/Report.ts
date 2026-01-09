import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  userId: mongoose.Types.ObjectId;
  type: "verbal" | "physical" | "stalking" | "assault";
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  description?: string;
  isAnonymous: boolean;
  status: "pending" | "verified" | "rejected";
  verifiedAt?: Date;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["verbal", "physical", "stalking", "assault"],
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
      address: String,
    },
    description: String,
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for heatmap queries
ReportSchema.index({ location: "2dsphere" });
ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ type: 1 });
ReportSchema.index({ status: 1 });

export const Report = mongoose.model<IReport>("Report", ReportSchema);
