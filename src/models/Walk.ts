import mongoose, { Schema, Document } from "mongoose";

export interface IWalk extends Document {
  userId: mongoose.Types.ObjectId;
  mode: "friend" | "guardian" | "safe-place";
  startTime: Date;
  endTime?: Date;
  duration?: string;
  startLocation: {
    lat: number;
    lng: number;
  };
  endLocation?: {
    lat: number;
    lng: number;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  contactIds: mongoose.Types.ObjectId[];
  guardianIds: mongoose.Types.ObjectId[];
  checkIns: Date[];
  panicEvents: Date[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalkSchema = new Schema<IWalk>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mode: {
      type: String,
      enum: ["friend", "guardian", "safe-place"],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: Date,
    duration: String,
    startLocation: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    endLocation: {
      lat: Number,
      lng: Number,
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    contactIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Contact",
      },
    ],
    guardianIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Contact",
      },
    ],
    checkIns: [Date],
    panicEvents: [Date],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

WalkSchema.index({ userId: 1, isActive: 1 });
WalkSchema.index({ startTime: -1 });

export const Walk = mongoose.model<IWalk>("Walk", WalkSchema);
