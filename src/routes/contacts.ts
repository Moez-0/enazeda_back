import express, { Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { Contact } from "../models/Contact";
import { z } from "zod";

const router = express.Router();

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  type: z.enum(["emergency", "guardian"]),
});

// Get user's contacts (with type filter)
router.get("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;
    const query: any = { userId: req.userId };
    
    if (type === "emergency" || type === "guardian") {
      query.type = type;
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json({
      contacts: contacts.map((contact) => ({
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        type: contact.type,
        createdAt: contact.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Add contact
router.post("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = contactSchema.parse(req.body);

    // Normalize email to lowercase if provided
    const contactData: any = {
      ...data,
      userId: req.userId,
    };
    
    if (data.email) {
      contactData.email = data.email.toLowerCase().trim();
    }

    const contact = await Contact.create(contactData);

    res.status(201).json({
      contact: {
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        type: contact.type,
        createdAt: contact.createdAt,
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

// Update contact
router.put("/:contactId", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.params;
    const data = contactSchema.parse(req.body);

    // Normalize email to lowercase if provided
    const updateData: any = { ...data };
    if (data.email) {
      updateData.email = data.email.toLowerCase().trim();
    }

    const contact = await Contact.findOneAndUpdate(
      { _id: contactId, userId: req.userId },
      updateData,
      { new: true }
    );

    if (!contact) {
      throw createError("Contact not found", 404);
    }

    res.json({
      contact: {
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        type: contact.type,
        createdAt: contact.createdAt,
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

// Delete contact
router.delete("/:contactId", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.params;

    const contact = await Contact.findOneAndDelete({
      _id: contactId,
      userId: req.userId,
    });

    if (!contact) {
      throw createError("Contact not found", 404);
    }

    res.json({ message: "Contact deleted", contactId });
  } catch (error) {
    next(error);
  }
});

export default router;
