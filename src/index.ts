import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";

// Routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import reportRoutes from "./routes/reports";
import walkRoutes from "./routes/walks";
import safeSpaceRoutes from "./routes/safeSpaces";
import contactRoutes from "./routes/contacts";
import notificationRoutes from "./routes/notifications";

// Models (to ensure they're registered)
import "./models/User";
import "./models/Report";
import "./models/Contact";
import "./models/Walk";
import "./models/SafeSpace";
import "./models/Notification";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/walks", walkRoutes);
app.use("/api/safe-spaces", safeSpaceRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/notifications", notificationRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
