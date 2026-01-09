import express, { Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { Report } from "../models/Report";
import { createError } from "../middleware/errorHandler";
import { z } from "zod";

const router = express.Router();

const createReportSchema = z.object({
  type: z.enum(["verbal", "physical", "stalking", "assault"]),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  description: z.string().optional(),
  isAnonymous: z.boolean().default(true),
});

// Create a new report
router.post("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createReportSchema.parse(req.body);

    const report = await Report.create({
      ...data,
      userId: req.userId,
    });

    res.status(201).json({
      id: report._id,
      type: report.type,
      location: report.location,
      description: report.description,
      isAnonymous: report.isAnonymous,
      status: report.status,
      createdAt: report.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

// Get heatmap data (aggregated reports)
router.get("/heatmap", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      throw createError("Latitude and longitude required", 400);
    }

    const centerLat = parseFloat(lat as string);
    const centerLng = parseFloat(lng as string);
    const radiusMeters = parseFloat(radius as string);

    // Get reports within radius (simplified for now)
    // In production, use geospatial queries
    const reports = await Report.find({
      "location.lat": {
        $gte: centerLat - radiusMeters / 111000,
        $lte: centerLat + radiusMeters / 111000,
      },
      "location.lng": {
        $gte: centerLng - radiusMeters / 111000,
        $lte: centerLng + radiusMeters / 111000,
      },
      status: { $in: ["pending", "verified"] },
    })
      .limit(1000)
      .select("type location createdAt");

    // Group by rounded coordinates for heatmap
    const grouped = reports.reduce((acc: any, report: any) => {
      const latKey = Math.round(report.location.lat * 100) / 100;
      const lngKey = Math.round(report.location.lng * 100) / 100;
      const key = `${latKey},${lngKey}`;
      
      if (!acc[key]) {
        acc[key] = {
          lat: latKey,
          lng: lngKey,
          count: 0,
          types: {} as Record<string, number>,
        };
      }
      
      acc[key].count++;
      acc[key].types[report.type] = (acc[key].types[report.type] || 0) + 1;
      
      return acc;
    }, {});

    res.json({ reports: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
});

// Get user's reports
router.get("/my-reports", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await Report.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      reports: reports.map((report) => ({
        id: report._id.toString(),
        type: report.type,
        location: report.location,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        date: report.createdAt.toISOString(), // Alias for compatibility
      })),
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    next(error);
  }
});

export default router;
