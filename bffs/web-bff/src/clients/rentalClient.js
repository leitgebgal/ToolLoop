const env = require("../config/env");
const httpClient = require("./httpClient");

const rentalClient = {
  async getRentals(status) {
    const response = await httpClient.get(`${env.rentalServiceUrl}/api/rentals`, {
      params: status ? { status } : undefined
    });
    return response.data;
  },

  async getRental(id) {
    const response = await httpClient.get(`${env.rentalServiceUrl}/api/rentals/${id}`);
    return response.data;
  },

  async getRentalsByBorrower(borrowerId) {
    const response = await httpClient.get(
      `${env.rentalServiceUrl}/api/rentals/borrower/${borrowerId}`
    );
    return response.data;
  },

  async getRentalsByOwner(ownerId) {
    const response = await httpClient.get(
      `${env.rentalServiceUrl}/api/rentals/owner/${ownerId}`
    );
    return response.data;
  },

  async getRentalsByItem(itemId) {
    const response = await httpClient.get(
      `${env.rentalServiceUrl}/api/rentals/item/${itemId}`
    );
    return response.data;
  },

  async createRental(body) {
    const response = await httpClient.post(`${env.rentalServiceUrl}/api/rentals`, body);
    return response.data;
  },

  async updateRentalStatus(id, body) {
    const response = await httpClient.patch(
      `${env.rentalServiceUrl}/api/rentals/${id}/status`,
      body
    );
    return response.data;
  },

  async cancelRental(id, requesterId) {
    const response = await httpClient.delete(`${env.rentalServiceUrl}/api/rentals/${id}`, {
      params: { requesterId }
    });
    return response.data;
  }
};

module.exports = rentalClient;