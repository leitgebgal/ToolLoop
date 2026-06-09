const axios = require("axios");

const httpClient = axios.create({
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

module.exports = httpClient;