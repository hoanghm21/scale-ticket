import express from "express";
import cors from "cors";
import { sendPurchaseEmail } from "./mailer";

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",").map(s => s.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "notification" });
});

app.post("/api/notify/purchase", async (req, res) => {
  const { email, firstName, eventTitle, ticketId, seats } = req.body;

  if (!email || !eventTitle || !ticketId) {
    return res.status(400).json({ error: "Missing required fields: email, eventTitle, ticketId" });
  }

  try {
    const { messageId, previewUrl } = await sendPurchaseEmail({ email, firstName, eventTitle, ticketId, seats });
    console.log(`[notify/purchase] sent messageId=${messageId} to=${email}${previewUrl ? ` preview=${previewUrl}` : ""}`);
    res.json({ success: true, messageId, previewUrl });
  } catch (err) {
    console.error("[notify/purchase] send failed", err);
    res.status(502).json({ error: "Failed to send notification email" });
  }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
