import express, { Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { createError } from "../middleware/errorHandler";

const router = express.Router();

// Get current user profile
router.get("/me", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    res.json({
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      provider: user.provider,
      trustScore: user.trustScore,
      isVerified: user.isVerified,
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch("/me", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name },
      { new: true }
    );

    if (!user) {
      throw createError("User not found", 404);
    }

    res.json({
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      provider: user.provider,
      trustScore: user.trustScore,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
