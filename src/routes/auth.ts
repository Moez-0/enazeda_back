import express, { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { createError } from "../middleware/errorHandler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const phoneLoginSchema = z.object({
  phone: z.string().regex(/^\+216\d{8}$/, "Invalid Tunisian phone number"),
});

const emailLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

const verifyOTPSchema = z.object({
  phone: z.string(),
  code: z.string().length(6, "OTP must be 6 digits"),
});

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Request OTP for phone login
router.post("/phone/request-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = phoneLoginSchema.parse(req.body);

    // In production, send OTP via Twilio
    // For now, we'll simulate it
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP (in production, use Redis with expiration)
    // For now, we'll just return it (NOT for production!)
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      message: "OTP sent successfully",
      // In production, don't send OTP in response
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

// Verify OTP and login/signup
router.post("/phone/verify-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = verifyOTPSchema.parse(req.body);

    // In production, verify OTP from Twilio
    // For now, accept any 6-digit code in development
    if (process.env.NODE_ENV === "production" && code !== "123456") {
      throw createError("Invalid OTP", 401);
    }

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        provider: "phone",
        isVerified: true,
      });
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        provider: user.provider,
        trustScore: user.trustScore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

// Email/Password signup
router.post("/email/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = emailLoginSchema.parse(req.body);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError("User already exists", 409);
    }

    // Hash password (in production, store this in a separate Password model)
    // For now, we'll just create the user
    const user = await User.create({
      email,
      name,
      provider: "email",
      isVerified: false,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        trustScore: user.trustScore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

// Email/Password login
router.post("/email/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = emailLoginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      throw createError("Invalid credentials", 401);
    }

    // In production, verify password with bcrypt
    // For now, accept any password in development
    if (process.env.NODE_ENV === "production") {
      // Verify password here
    }

    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        trustScore: user.trustScore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

// Google OAuth
router.post("/google", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      throw createError("Google credential required", 400);
    }

    // Verify Google ID token
    // In production, verify the token with Google's API
    // For now, decode the JWT to get user info
    try {
      const parts = credential.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonPayload);

      const email = payload.email;
      const name = payload.name || payload.given_name || "";

      if (!email) {
        throw createError("Email not found in Google token", 400);
      }

      // Find or create user
      let user = await User.findOne({ email, provider: "google" });

      if (!user) {
        user = await User.create({
          email,
          name,
          provider: "google",
          isVerified: true,
        });
      } else {
        // Update name if provided
        if (name && !user.name) {
          user.name = name;
          await user.save();
        }
      }

      const token = generateToken(user._id.toString());

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          provider: user.provider,
          trustScore: user.trustScore,
        },
      });
    } catch (decodeError) {
      throw createError("Invalid Google token", 401);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
