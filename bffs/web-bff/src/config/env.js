const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 8081),

  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3000",
  rentalServiceUrl: process.env.RENTAL_SERVICE_URL || "http://localhost:5000",
  itemGrpcUrl: process.env.ITEM_GRPC_URL || "localhost:50051",
  itemHttpUrl: process.env.ITEM_HTTP_URL || "http://localhost:8080",

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173"
};