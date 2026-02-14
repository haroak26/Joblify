import express, { type Express, type Request, type Response } from "express";
// import { chatStorage } from "../chat/storage"; // Disabled - chat storage not implemented
import { openai, speechToText, ensureCompatibleFormat } from "./client";

// Body parser with 50MB limit for audio payloads
const audioBodyParser = express.json({ limit: "50mb" });

export function registerAudioRoutes(app: Express): void {
  // NOTE: Audio chat routes are disabled as chatStorage implementation is not available
  // These routes are for future audio chat functionality
  
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    res.status(501).json({ error: "Audio conversations not implemented" });
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    res.status(501).json({ error: "Audio conversations not implemented" });
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    res.status(501).json({ error: "Audio conversations not implemented" });
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    res.status(501).json({ error: "Audio conversations not implemented" });
  });

  // Send voice message and get streaming audio response
  app.post("/api/conversations/:id/messages", audioBodyParser, async (req: Request, res: Response) => {
    res.status(501).json({ error: "Audio conversations not implemented" });
  });
}
