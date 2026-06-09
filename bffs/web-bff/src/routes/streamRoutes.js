const express = require("express");
const axios = require("axios");
const env = require("../config/env");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const upstream = await axios.get(`${env.rentalServiceUrl}/api/rentals/stream`, {
      responseType: "stream"
    });

    upstream.data.pipe(res);

    req.on("close", () => {
      upstream.data.destroy();
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;