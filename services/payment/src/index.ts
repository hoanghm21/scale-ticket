import express from "express";
import cors from "cors";
import checkoutRouter from "./routes/checkout";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/checkout", checkoutRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
