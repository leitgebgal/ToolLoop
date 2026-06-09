const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const itemRoutes = require("./routes/itemRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const streamRoutes = require("./routes/streamRoutes");
const adminRoutes = require("./routes/adminRoutes");
const healthClient = require("./clients/healthClient");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({
    service: "web-bff",
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

app.get("/health/ready", async (_req, res) => {
  const result = await healthClient.readiness();
  const statusCode = result.status === "UP" ? 200 : 503;
  res.status(statusCode).json(result);
});

app.use("/admin", adminRoutes);

app.use("/api/web/auth", authRoutes);
app.use("/api/web/users", userRoutes);
app.use("/api/web/items", itemRoutes);
app.use("/api/web/rentals/stream", streamRoutes);
app.use("/api/web/rentals", rentalRoutes);
app.use("/api/web/dashboard", dashboardRoutes);

app.use(errorHandler);

module.exports = app;