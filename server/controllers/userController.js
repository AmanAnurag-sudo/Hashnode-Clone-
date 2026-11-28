
const User = require('../models/Users');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const bcrypt = require('bcryptjs');

const findUserByIdentifier = async (identifier) => {
  const userByUsername = await User.findOne({ username: identifier });

  if (userByUsername || !/^[a-f\d]{24}$/i.test(identifier)) {
    return userByUsername;
  }

  return User.findById(identifier);
};

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email or username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const jwt = require('jsonwebtoken');

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get public user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username
    }).select('name username bio profileImage createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [posts, followerCount, followingCount] = await Promise.all([
      Post.find({
        author: user._id,
        ...Post.publishedFilter()
      })
        .select('title slug coverImage tags createdAt status isPublished')
        .sort({ createdAt: -1 }),
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id })
    ]);

    return res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        followerCount,
        followingCount
      },
      posts: posts.map((post) => {
        const postObject = post.toObject();
        delete postObject.isPublished;
        return postObject;
      })
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Follow a user by username or user ID
const followUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required'
      });
    }

    const userToFollow = await findUserByIdentifier(req.params.identifier);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user._id.equals(userToFollow._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: userToFollow._id
    });

    if (existingFollow) {
      return res.status(200).json({
        success: true,
        message: 'Already following this user'
      });
    }

    await Follow.create({
      follower: req.user._id,
      following: userToFollow._id
    });

    return res.status(201).json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'Already following this user'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unfollow a user by username or user ID
const unfollowUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required'
      });
    }

    const userToUnfollow = await findUserByIdentifier(req.params.identifier);

    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user._id.equals(userToUnfollow._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot unfollow yourself'
      });
    }

    const result = await Follow.deleteOne({
      follower: req.user._id,
      following: userToUnfollow._id
    });

    return res.status(200).json({
      success: true,
      message: result.deletedCount ? 'User unfollowed successfully' : 'User was not followed'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get users who follow the specified username
const getFollowers = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [follows, count] = await Promise.all([
      Follow.find({ following: user._id })
        .select('follower')
        .populate('follower', 'name username bio profileImage createdAt')
        .sort({ createdAt: -1 }),
      Follow.countDocuments({ following: user._id })
    ]);

    return res.status(200).json({
      success: true,
      count,
      followers: follows.map((follow) => follow.follower).filter(Boolean)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get users followed by the specified username
const getFollowing = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [follows, count] = await Promise.all([
      Follow.find({ follower: user._id })
        .select('following')
        .populate('following', 'name username bio profileImage createdAt')
        .sort({ createdAt: -1 }),
      Follow.countDocuments({ follower: user._id })
    ]);

    return res.status(200).json({
      success: true,
      count,
      following: follows.map((follow) => follow.following).filter(Boolean)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update the authenticated user's profile
const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required'
      });
    }

    const body = req.body;
    const fields = ['name', 'bio', 'profileImage'];

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide profile fields to update'
      });
    }

    const providedFields = fields.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    );

    if (providedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one profile field to update'
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(body, 'name') &&
      (typeof body.name !== 'string' || !body.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty'
      });
    }

    for (const field of ['bio', 'profileImage']) {
      if (
        Object.prototype.hasOwnProperty.call(body, field) &&
        typeof body[field] !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`
        });
      }
    }

    providedFields.forEach((field) => {
      req.user[field] = body[field];
    });

    const user = await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
};
