import express from "express";

const app = express();
app.use(express.json());

// Basic CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "notification" });
});

app.post("/api/notify/purchase", (req, res) => {
  const { email, firstName, eventTitle, ticketId, seats } = req.body;
  
  console.log("\n=============================================");
  console.log("🔔 NOTIFICATION SERVICE TRIGGERED");
  console.log(`📧 Sending email to: ${email}`);
  console.log(`Subject: Your Tickets for ${eventTitle}!`);
  console.log(`Hi ${firstName},`);
  console.log(`Your purchase was successful. Your ticket ID is: ${ticketId}`);
  console.log(`Seats: ${seats} tickets`);
  console.log("=============================================\n");

  res.json({ success: true, message: "Notification sent" });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`Notification service placeholder running on port ${PORT}`);
});
