import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: "panic" | "walk_started" | "walk_ended" | "check_in" | "report" | "system";
  title: string;
  message: string;
  walkId?: mongoose.Types.ObjectId;
  isRead: boolean;
  metadata?: {
    location?: { lat: number; lng: number };
    userName?: string;
    walkSessionId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["panic", "walk_started", "walk_ended", "check_in", "report", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    walkId: {
      type: Schema.Types.ObjectId,
      ref: "Walk",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
