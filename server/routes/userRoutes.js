const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');

// POST /api/users/register
router.post('/register', registerUser);

// POST /api/users/login
router.post('/login', loginUser);

// GET /api/users/me (Protected)
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User authenticated successfully',
    user: req.user
  });
});

// PUT /api/users/profile (Protected)
router.put('/profile', authMiddleware, updateProfile);

// GET /api/users/:username (Public Profile)
router.get('/:username', getUserProfile);

module.exports = router;
