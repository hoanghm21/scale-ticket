import express from "express";
import cors from "cors";

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",").map(s => s.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "notification" });
});

app.post("/api/notify/purchase", (req, res) => {
  const { email, firstName, eventTitle, ticketId, seats } = req.body;

  // Basic input validation
  if (!email || !eventTitle || !ticketId) {
    return res.status(400).json({ error: "Missing required fields: email, eventTitle, ticketId" });
  }
  
  console.log("\n=============================================");
  console.log("🔔 NOTIFICATION SERVICE TRIGGERED");
  console.log(`📧 Sending email to: ${email}`);
  console.log(`Subject: Your Tickets for ${eventTitle}!`);
  console.log(`Hi ${firstName || "Customer"},`);
  console.log(`Your purchase was successful. Your ticket ID is: ${ticketId}`);
  console.log(`Seats: ${seats} tickets`);
  console.log("=============================================\n");

  // TODO: Replace with real email provider (SendGrid, SES, Nodemailer)

  res.json({ success: true, message: "Notification sent" });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
