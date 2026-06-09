const axios = require("axios");

function errorHandler(error, _req, res, _next) {
  console.error("Web BFF error:", error);

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 502;
    const data = error.response?.data || {
      error: "Downstream service error"
    };

    return res.status(status).json(data);
  }

  if (error && error.code && error.details) {
    return res.status(502).json({
      error: "gRPC downstream service error",
      code: error.code,
      details: error.details
    });
  }

  if (error instanceof Error) {
    return res.status(500).json({
      error: error.message
    });
  }

  return res.status(500).json({
    error: "Unexpected web-bff error"
  });
}

module.exports = errorHandler;