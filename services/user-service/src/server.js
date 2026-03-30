const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

dotenv.config();

const port = process.env.PORT || 3000;

(async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`User service running on port ${port}`);
  });
})();