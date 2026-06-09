const express = require("express");
const { getBreakerSnapshot } = require("../utils/circuitBreaker");

const router = express.Router();

router.get("/breakers", (_req, res) => {
  res.json({
    service: "web-bff",
    breakers: getBreakerSnapshot()
  });
});

module.exports = router;