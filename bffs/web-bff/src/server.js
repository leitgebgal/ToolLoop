const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`Web BFF running on http://localhost:${env.port}`);
});