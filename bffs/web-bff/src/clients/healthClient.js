const httpClient = require("./httpClient");
const env = require("../config/env");

async function checkHttpService(name, url) {
  try {
    const response = await httpClient.get(url, {
      timeout: 2000
    });

    return {
      name,
      status: response.status >= 200 && response.status < 300 ? "UP" : "DOWN",
      details: response.data
    };
  } catch (error) {
    return {
      name,
      status: "DOWN",
      error: error.message
    };
  }
}

async function readiness() {
  const checks = await Promise.all([
    checkHttpService("user-service", `${env.userServiceUrl}/health`),
    checkHttpService("item-service", `${env.itemHttpUrl}/health`),
    checkHttpService("rental-service", `${env.rentalServiceUrl}/health`)
  ]);

  const status = checks.every((check) => check.status === "UP") ? "UP" : "DEGRADED";

  return {
    service: "web-bff",
    status,
    checks,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  readiness
};