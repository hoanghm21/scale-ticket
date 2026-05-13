import express from "express";
import cors from "cors";
import checkoutRouter from "./routes/checkout";

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:4000").split(",").map(s => s.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.use("/api/checkout", checkoutRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "payment" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
