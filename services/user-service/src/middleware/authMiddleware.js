const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.warn('Access denied - no token provided');
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Token validation failed:', error.message);
    return res.status(401).json({ error: 'Not authorized, invalid token' });
  }
};

module.exports = { protect };