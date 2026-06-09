const env = require("../config/env");
const httpClient = require("./httpClient");
const { createBreaker } = require("../utils/circuitBreaker");

const registerBreaker = createBreaker("user.register", async (body) => {
  const response = await httpClient.post(`${env.userServiceUrl}/api/users/register`, body);
  return response.data;
});

const loginBreaker = createBreaker("user.login", async (body) => {
  const response = await httpClient.post(`${env.userServiceUrl}/api/users/login`, body);
  return response.data;
});

const getUsersBreaker = createBreaker(
  "user.getUsers",
  async (headers) => {
    const response = await httpClient.get(`${env.userServiceUrl}/api/users`, {
      headers
    });
    return response.data;
  },
  () => []
);

const getUserBreaker = createBreaker("user.getUser", async (id, headers) => {
  const response = await httpClient.get(`${env.userServiceUrl}/api/users/${id}`, {
    headers
  });
  return response.data;
});

const updateUserBreaker = createBreaker("user.updateUser", async (id, body, headers) => {
  const response = await httpClient.put(`${env.userServiceUrl}/api/users/${id}`, body, {
    headers
  });
  return response.data;
});

const deleteUserBreaker = createBreaker("user.deleteUser", async (id, headers) => {
  const response = await httpClient.delete(`${env.userServiceUrl}/api/users/${id}`, {
    headers
  });
  return response.data;
});

const userClient = {
  register: (body) => registerBreaker.fire(body),
  login: (body) => loginBreaker.fire(body),
  getUsers: (headers) => getUsersBreaker.fire(headers),
  getUser: (id, headers) => getUserBreaker.fire(id, headers),
  updateUser: (id, body, headers) => updateUserBreaker.fire(id, body, headers),
  deleteUser: (id, headers) => deleteUserBreaker.fire(id, headers)
};

module.exports = userClient;