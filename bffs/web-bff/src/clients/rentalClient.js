const env = require("../config/env");
const httpClient = require("./httpClient");
const { createBreaker } = require("../utils/circuitBreaker");

const getRentalsBreaker = createBreaker(
  "rental.getRentals",
  async (status) => {
    const response = await httpClient.get(`${env.rentalServiceUrl}/api/rentals`, {
      params: status ? { status } : undefined
    });
    return response.data;
  },
  () => []
);

const getRentalBreaker = createBreaker("rental.getRental", async (id) => {
  const response = await httpClient.get(`${env.rentalServiceUrl}/api/rentals/${id}`);
  return response.data;
});

const getRentalsByBorrowerBreaker = createBreaker(
  "rental.getRentalsByBorrower",
  async (borrowerId) => {
    const response = await httpClient.get(
      `${env.rentalServiceUrl}/api/rentals/borrower/${borrowerId}`
    );
    return response.data;
  },
  () => []
);

const getRentalsByOwnerBreaker = createBreaker(
  "rental.getRentalsByOwner",
  async (ownerId) => {
    const response = await httpClient.get(
      `${env.rentalServiceUrl}/api/rentals/owner/${ownerId}`
    );
    return response.data;
  },
  () => []
);

const getRentalsByItemBreaker = createBreaker(
  "rental.getRentalsByItem",
  async (itemId) => {
    const response = await httpClient.get(
      `${env.rentalServiceUrl}/api/rentals/item/${itemId}`
    );
    return response.data;
  },
  () => []
);

const createRentalBreaker = createBreaker("rental.createRental", async (body) => {
  const response = await httpClient.post(`${env.rentalServiceUrl}/api/rentals`, body);
  return response.data;
});

const updateRentalStatusBreaker = createBreaker(
  "rental.updateRentalStatus",
  async (id, body) => {
    const response = await httpClient.patch(
      `${env.rentalServiceUrl}/api/rentals/${id}/status`,
      body
    );
    return response.data;
  }
);

const cancelRentalBreaker = createBreaker("rental.cancelRental", async (id, requesterId) => {
  const response = await httpClient.delete(`${env.rentalServiceUrl}/api/rentals/${id}`, {
    params: { requesterId }
  });
  return response.data;
});

const rentalClient = {
  getRentals: (status) => getRentalsBreaker.fire(status),
  getRental: (id) => getRentalBreaker.fire(id),
  getRentalsByBorrower: (borrowerId) => getRentalsByBorrowerBreaker.fire(borrowerId),
  getRentalsByOwner: (ownerId) => getRentalsByOwnerBreaker.fire(ownerId),
  getRentalsByItem: (itemId) => getRentalsByItemBreaker.fire(itemId),
  createRental: (body) => createRentalBreaker.fire(body),
  updateRentalStatus: (id, body) => updateRentalStatusBreaker.fire(id, body),
  cancelRental: (id, requesterId) => cancelRentalBreaker.fire(id, requesterId)
};

module.exports = rentalClient;