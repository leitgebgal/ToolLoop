const express = require("express");
const userClient = require("../clients/userClient");
const rentalClient = require("../clients/rentalClient");
const itemGrpcClient = require("../clients/itemGrpcClient");
const { getAuthorizationHeader } = require("../middleware/authForwarder");

const router = express.Router();

router.get("/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const headers = getAuthorizationHeader(req);

    const [user, ownedItems, borrowedRentals, ownerRentals] = await Promise.all([
      userClient.getUser(userId, headers),
      itemGrpcClient.getItemsByOwner(userId),
      rentalClient.getRentalsByBorrower(userId),
      rentalClient.getRentalsByOwner(userId)
    ]);

    return res.json({
      user,
      ownedItems,
      borrowedRentals,
      ownerRentals,
      summary: {
        ownedItemCount: ownedItems.length,
        borrowedRentalCount: borrowedRentals.length,
        ownerRentalCount: ownerRentals.length
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;