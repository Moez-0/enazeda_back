import express, { Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { Notification } from "../models/Notification";

const router = express.Router();

// Get user's notifications
router.get("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    
    const query: any = { userId: req.userId };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10))
      .populate("walkId", "mode startTime");

    res.json({
      notifications: notifications.map((notif) => ({
        id: notif._id.toString(),
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.isRead,
        metadata: notif.metadata,
        createdAt: notif.createdAt.toISOString(),
        readAt: notif.readAt?.toISOString(),
        walkId: notif.walkId?.toString(),
      })),
      unreadCount: await Notification.countDocuments({ userId: req.userId, isRead: false }),
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch("/:notificationId/read", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw createError("Notification not found", 404);
    }

    res.json({
      id: notification._id.toString(),
      isRead: notification.isRead,
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch("/read-all", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
});

export default router;
