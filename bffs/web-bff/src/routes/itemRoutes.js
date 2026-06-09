const express = require("express");
const itemGrpcClient = require("../clients/itemGrpcClient");
const rentalClient = require("../clients/rentalClient");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await itemGrpcClient.getAllItems();
    return res.json(items);
  } catch (error) {
    return next(error);
  }
});

router.get("/available", async (_req, res, next) => {
  try {
    const items = await itemGrpcClient.getAvailableItems();
    return res.json(items);
  } catch (error) {
    return next(error);
  }
});

router.get("/category/:category", async (req, res, next) => {
  try {
    const items = await itemGrpcClient.getItemsByCategory(req.params.category);
    return res.json(items);
  } catch (error) {
    return next(error);
  }
});

router.get("/owner/:ownerId", async (req, res, next) => {
  try {
    const items = await itemGrpcClient.getItemsByOwner(req.params.ownerId);
    return res.json(items);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/availability", async (req, res, next) => {
  try {
    const result = await itemGrpcClient.checkItemAvailability(req.params.id);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/rentals", async (req, res, next) => {
  try {
    const itemResult = await itemGrpcClient.getItem(req.params.id);

    if (!itemResult.found || !itemResult.item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const availability = await itemGrpcClient.checkItemAvailability(req.params.id);

    if (!availability.available) {
      return res.status(409).json({ error: "Item is not available" });
    }

    const rental = await rentalClient.createRental({
      itemId: req.params.id,
      borrowerId: req.body.borrowerId,
      ownerId: itemResult.item.ownerId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      message: req.body.message || ""
    });

    return res.status(201).json(rental);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await itemGrpcClient.getItem(req.params.id);

    if (!result.found || !result.item) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.json(result.item);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const result = await itemGrpcClient.createItem(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.message
      });
    }

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const result = await itemGrpcClient.updateItem(req.params.id, req.body);

    if (!result.success) {
      return res.status(404).json({
        error: result.message
      });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const result = await itemGrpcClient.updateItemStatus(
      req.params.id,
      req.body.status
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.message
      });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await itemGrpcClient.deleteItem(req.params.id);

    if (!result.success) {
      return res.status(404).json({
        error: result.message
      });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;