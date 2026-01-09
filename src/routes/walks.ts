import express, { Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { Walk } from "../models/Walk";
import { Contact } from "../models/Contact";
import { User } from "../models/User";
import { Notification } from "../models/Notification";
import mongoose from "mongoose";
import { z } from "zod";

const router = express.Router();

const startWalkSchema = z.object({
  mode: z.enum(["friend", "guardian", "safe-place"]),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  contactIds: z.array(z.string()).optional(),
  guardianIds: z.array(z.string()).optional(),
});

// Start a walk session
router.post("/start", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = startWalkSchema.parse(req.body);

    const walk = await Walk.create({
      userId: req.userId,
      mode: data.mode,
      startTime: new Date(),
      startLocation: data.location,
      contactIds: data.contactIds?.map(id => new mongoose.Types.ObjectId(id)) || [],
      guardianIds: data.guardianIds?.map(id => new mongoose.Types.ObjectId(id)) || [],
      isActive: true,
    });

    res.status(201).json({
      sessionId: walk._id.toString(),
      mode: walk.mode,
      location: walk.startLocation,
      startedAt: walk.startTime.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

// Update walk location
router.post("/:sessionId/location", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      throw createError("Location required", 400);
    }

    const now = new Date();
    const walk = await Walk.findOneAndUpdate(
      { _id: sessionId, userId: req.userId, isActive: true },
      { 
        $set: { 
          "endLocation.lat": lat, 
          "endLocation.lng": lng,
          "currentLocation.lat": lat,
          "currentLocation.lng": lng,
          "currentLocation.updatedAt": now,
        } 
      },
      { new: true }
    );

    if (!walk) {
      throw createError("Walk session not found", 404);
    }

    res.json({
      sessionId: walk._id.toString(),
      location: { lat, lng },
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Trigger panic button
router.post("/:sessionId/panic", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { location } = req.body;

    const walk = await Walk.findOneAndUpdate(
      { _id: sessionId, userId: req.userId, isActive: true },
      { $push: { panicEvents: new Date() } },
      { new: true }
    ).populate("userId", "name email phone");

    if (!walk) {
      throw createError("Walk session not found", 404);
    }

    // Walker info
    const walker = walk.userId as any;
    const walkerName = walker?.name || walker?.email || "Someone";

    // Contacts (emergency + guardian)
    const contacts = await Contact.find({
      _id: { $in: [...walk.contactIds, ...walk.guardianIds] },
      userId: req.userId,
    }).populate("userId", "email phone");

    // Guardians
    const guardianUserIds: mongoose.Types.ObjectId[] = [];
    for (const contact of contacts) {
      if (contact.type === "guardian") {
        const orConditions: any[] = [];
        if (contact.email) orConditions.push({ email: contact.email.toLowerCase().trim() });
        if (contact.phone) orConditions.push({ phone: contact.phone.trim() });
        if (orConditions.length > 0) {
          const guardians = await User.find({ $or: orConditions });
          guardianUserIds.push(...guardians.map(u => u._id));
        }
      }
    }

    // Notifications
    const panicLocation = location ?? walk.currentLocation ?? walk.startLocation ?? { lat: 0, lng: 0 };
    const notifications = guardianUserIds.map(guardianUserId => ({
      userId: guardianUserId,
      type: "panic" as const,
      title: "🚨 Panic Alert",
      message: `${walkerName} has triggered a panic button during their walk.`,
      walkId: walk._id,
      isRead: false,
      metadata: { location: panicLocation, userName: walkerName },
    }));

    if (notifications.length > 0) {
      try {
        await Notification.insertMany(notifications);
        console.log(`Panic for walk ${sessionId}: created ${notifications.length} notifications`);
      } catch (err) {
        console.error("Error creating notifications:", err);
      }
    }

    const emergencyContacts = contacts.filter(c => c.type === "emergency");
    if (emergencyContacts.length === 0) {
      console.log(`No emergency contacts for walk ${sessionId}`);
    }

    // Always respond
    res.json({
      sessionId: walk._id.toString(),
      panicTriggered: true,
      notificationsSent: notifications.length,
      emergencyContacts: emergencyContacts.length,
      timestamp: new Date().toISOString(),
      message: "Panic processed successfully",
    });

  } catch (error) {
    console.error("Panic route error:", error);
    next(error);
  }
});
// Add check-in
router.post("/:sessionId/checkin", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const walk = await Walk.findOneAndUpdate(
      { _id: sessionId, userId: req.userId, isActive: true },
      { $push: { checkIns: new Date() } },
      { new: true }
    );

    if (!walk) {
      throw createError("Walk session not found", 404);
    }

    res.json({
      sessionId: walk._id.toString(),
      checkInAt: new Date().toISOString(),
      message: "Check-in recorded",
    });
  } catch (error) {
    next(error);
  }
});

// End walk session
router.post("/:sessionId/end", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { location } = req.body;

    const walk = await Walk.findOne({ _id: sessionId, userId: req.userId, isActive: true });

    if (!walk) {
      throw createError("Walk session not found", 404);
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - walk.startTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const duration = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    walk.endTime = endTime;
    walk.duration = duration;
    walk.isActive = false;
    if (location) {
      walk.endLocation = location;
    }
    await walk.save();

    res.json({
      sessionId: walk._id.toString(),
      endedAt: walk.endTime.toISOString(),
      duration: walk.duration,
      message: "Walk session ended",
    });
  } catch (error) {
    next(error);
  }
});

// Get user's walk history
router.get("/history", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const walks = await Walk.find({ userId: req.userId })
      .sort({ startTime: -1 })
      .limit(50)
      .populate("contactIds", "name phone")
      .populate("guardianIds", "name phone email");

    res.json({
      walks: walks.map((walk) => ({
        id: walk._id.toString(),
        mode: walk.mode,
        startTime: walk.startTime.toISOString(),
        endTime: walk.endTime?.toISOString(),
        duration: walk.duration,
        endLocation: walk.endLocation,
        startLocation: walk.startLocation,
        checkIns: walk.checkIns.length,
        panicEvents: walk.panicEvents.length,
        isActive: walk.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching walk history:", error);
    next(error);
  }
});

// Get active walks for a guardian (walks where this user's phone/email matches a guardian contact)
router.get("/guardian/active", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get current user's phone/email
    const user = await User.findById(req.userId);
    if (!user) {
      console.error(`User not found for userId: ${req.userId}`);
      return res.json({ walks: [] });
    }

    // Build query for guardian contacts - match by phone or email
    // Prioritize email matching for email-based users
    const contactQuery: any = {
      type: "guardian",
    };

    const orConditions: any[] = [];
    
    // Always try to match by email first (normalized to lowercase)
    if (user.email) {
      orConditions.push({ email: user.email.toLowerCase().trim() });
    }
    
    // Also try to match by phone if user has one
    if (user.phone) {
      orConditions.push({ phone: user.phone.trim() });
    }

    if (orConditions.length === 0) {
      // User has no phone or email, can't match guardian contacts
      console.log(`User ${req.userId} has no phone or email for guardian matching`);
      return res.json({ walks: [] });
    }

    contactQuery.$or = orConditions;

    console.log(`Looking for guardian contacts matching user email: ${user.email}, phone: ${user.phone}`);
    console.log(`Query:`, JSON.stringify(contactQuery, null, 2));

    // Find all contacts that match this user's phone or email (these are the guardian contacts)
    const guardianContacts = await Contact.find(contactQuery);
    
    console.log(`Found ${guardianContacts.length} guardian contacts for user ${req.userId}`);

    if (guardianContacts.length === 0) {
      return res.json({ walks: [] });
    }

    const guardianContactIds = guardianContacts.map(c => c._id);

    // Find active walks where these guardian contacts are included
    const walks = await Walk.find({
      guardianIds: { $in: guardianContactIds },
      isActive: true,
    })
      .populate("userId", "name email phone")
      .populate("contactIds", "name phone")
      .populate("guardianIds", "name phone email")
      .sort({ startTime: -1 });

    res.json({
      walks: walks.map((walk) => ({
        id: walk._id.toString(),
        userId: (walk.userId as any)?._id?.toString(),
        userName: (walk.userId as any)?.name || (walk.userId as any)?.email || "Unknown",
        mode: walk.mode,
        startTime: walk.startTime.toISOString(),
        startLocation: walk.startLocation,
        currentLocation: walk.currentLocation || walk.startLocation,
        checkIns: walk.checkIns.length,
        panicEvents: walk.panicEvents.length,
        lastCheckIn: walk.checkIns.length > 0 ? walk.checkIns[walk.checkIns.length - 1].toISOString() : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Get real-time location for a specific walk (for guardians)
router.get("/:sessionId/location", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    // Get current user
    const user = await User.findById(req.userId);
    if (!user) {
      console.error(`User not found for userId: ${req.userId}`);
      return res.json({
        sessionId,
        userName: "Unknown",
        location: { lat: 0, lng: 0 },
        startLocation: { lat: 0, lng: 0 },
        startTime: new Date().toISOString(),
        checkIns: 0,
        panicEvents: 0,
        lastCheckIn: null,
        lastLocationUpdate: new Date().toISOString(),
      });
    }

    const walk = await Walk.findOne({
      _id: sessionId,
      isActive: true,
    })
      .populate("userId", "name email")
      .populate("guardianIds", "name phone email");

    if (!walk) {
      throw createError("Walk session not found", 404);
    }

    // Check if this user is a guardian for this walk (by matching phone/email)
    const guardianQuery: any = {
      _id: { $in: walk.guardianIds },
      type: "guardian",
    };

    const orConditions: any[] = [];
    
    // Prioritize email matching (normalized to lowercase)
    if (user.email) {
      orConditions.push({ email: user.email.toLowerCase().trim() });
    }
    
    // Also try phone matching
    if (user.phone) {
      orConditions.push({ phone: user.phone.trim() });
    }

    if (orConditions.length > 0) {
      guardianQuery.$or = orConditions;
    } else {
      // User has no phone or email, can't be a guardian
      console.log(`User ${req.userId} has no phone or email for guardian authorization`);
      throw createError("Unauthorized", 403);
    }

    console.log(`Checking guardian authorization for walk ${sessionId}, query:`, JSON.stringify(guardianQuery, null, 2));
    const guardianContacts = await Contact.find(guardianQuery);
    console.log(`Found ${guardianContacts.length} matching guardian contacts`);

    const isGuardian = guardianContacts.length > 0;
    const isOwner = walk.userId._id.toString() === req.userId;

    if (!isGuardian && !isOwner) {
      throw createError("Unauthorized", 403);
    }

    res.json({
      sessionId: walk._id.toString(),
      userName: (walk.userId as any)?.name || (walk.userId as any)?.email || "Unknown",
      location: walk.currentLocation || walk.startLocation,
      startLocation: walk.startLocation,
      startTime: walk.startTime.toISOString(),
      checkIns: walk.checkIns.length,
      panicEvents: walk.panicEvents.length,
      lastCheckIn: walk.checkIns.length > 0 ? walk.checkIns[walk.checkIns.length - 1].toISOString() : null,
      lastLocationUpdate: walk.currentLocation?.updatedAt?.toISOString() || walk.startTime.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
