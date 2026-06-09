const express = require("express");
const userClient = require("../clients/userClient");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const result = await userClient.register(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const result = await userClient.login(req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;