const express = require("express");
const userClient = require("../clients/userClient");
const { getAuthorizationHeader } = require("../middleware/authForwarder");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await userClient.getUsers(getAuthorizationHeader(req));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await userClient.getUser(req.params.id, getAuthorizationHeader(req));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const result = await userClient.updateUser(
      req.params.id,
      req.body,
      getAuthorizationHeader(req)
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await userClient.deleteUser(
      req.params.id,
      getAuthorizationHeader(req)
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;