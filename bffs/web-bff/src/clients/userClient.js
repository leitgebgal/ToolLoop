const env = require("../config/env");
const httpClient = require("./httpClient");

const userClient = {
  async register(body) {
    const response = await httpClient.post(`${env.userServiceUrl}/api/users/register`, body);
    return response.data;
  },

  async login(body) {
    const response = await httpClient.post(`${env.userServiceUrl}/api/users/login`, body);
    return response.data;
  },

  async getUsers(headers) {
    const response = await httpClient.get(`${env.userServiceUrl}/api/users`, {
      headers
    });
    return response.data;
  },

  async getUser(id, headers) {
    const response = await httpClient.get(`${env.userServiceUrl}/api/users/${id}`, {
      headers
    });
    return response.data;
  },

  async updateUser(id, body, headers) {
    const response = await httpClient.put(`${env.userServiceUrl}/api/users/${id}`, body, {
      headers
    });
    return response.data;
  },

  async deleteUser(id, headers) {
    const response = await httpClient.delete(`${env.userServiceUrl}/api/users/${id}`, {
      headers
    });
    return response.data;
  }
};

module.exports = userClient;