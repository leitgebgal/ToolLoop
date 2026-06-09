const express = require("express");
const rentalClient = require("../clients/rentalClient");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rentals = await rentalClient.getRentals(status);
    return res.json(rentals);
  } catch (error) {
    return next(error);
  }
});

router.get("/borrower/:borrowerId", async (req, res, next) => {
  try {
    const rentals = await rentalClient.getRentalsByBorrower(req.params.borrowerId);
    return res.json(rentals);
  } catch (error) {
    return next(error);
  }
});

router.get("/owner/:ownerId", async (req, res, next) => {
  try {
    const rentals = await rentalClient.getRentalsByOwner(req.params.ownerId);
    return res.json(rentals);
  } catch (error) {
    return next(error);
  }
});

router.get("/item/:itemId", async (req, res, next) => {
  try {
    const rentals = await rentalClient.getRentalsByItem(req.params.itemId);
    return res.json(rentals);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const rental = await rentalClient.getRental(req.params.id);
    return res.json(rental);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const rental = await rentalClient.createRental(req.body);
    return res.status(201).json(rental);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const rental = await rentalClient.updateRentalStatus(req.params.id, req.body);
    return res.json(rental);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const requesterId =
      typeof req.query.requesterId === "string" ? req.query.requesterId : undefined;

    if (!requesterId) {
      return res.status(400).json({
        error: "requesterId query parameter is required"
      });
    }

    const result = await rentalClient.cancelRental(req.params.id, requesterId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;