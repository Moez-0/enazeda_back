import express, { Response, NextFunction } from "express";
import { createError } from "../middleware/errorHandler";
import { SafeSpace } from "../models/SafeSpace";

const router = express.Router();

// Get safe spaces near a location
router.get("/nearby", async (req: express.Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      throw createError("Latitude and longitude required", 400);
    }

    const centerLat = parseFloat(lat as string);
    const centerLng = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string) / 1000; // Convert to km

    // Find safe spaces within radius (simplified distance calculation)
    // In production, use geospatial queries
    const safeSpaces = await SafeSpace.find({
      verified: true,
      "location.lat": {
        $gte: centerLat - radiusKm / 111,
        $lte: centerLat + radiusKm / 111,
      },
      "location.lng": {
        $gte: centerLng - radiusKm / 111,
        $lte: centerLng + radiusKm / 111,
      },
    }).limit(50);

    res.json({
      safeSpaces: safeSpaces.map((space) => ({
        id: space._id.toString(),
        name: space.name,
        type: space.type,
        location: space.location,
        isOpen: space.isOpen,
        verified: space.verified,
        hours: space.hours,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
