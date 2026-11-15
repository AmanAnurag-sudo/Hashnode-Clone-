const jwt = require('jsonwebtoken');
const User = require('../models/Users');

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    const bearerMatch =
      typeof authorization === 'string' &&
      authorization.match(/^Bearer\s+(\S+)$/i);

    if (!bearerMatch) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(bearerMatch[1], process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token'
      });
    }

    if (!decoded || typeof decoded.id !== 'string' || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token'
      });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = authMiddleware;
