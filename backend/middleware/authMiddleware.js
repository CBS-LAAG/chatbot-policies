const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized if no token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Forbidden if token is invalid
    }
    req.user = user; // Add decoded user payload to request object
    next();
  });
};

const authorizeRole = (rolesArray) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      // This should ideally not happen if authenticateToken runs first
      return res.status(403).json({ message: 'User role not available.' });
    }

    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden. User role '${req.user.role}' is not authorized.` });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};
