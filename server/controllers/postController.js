const Post = require('../models/Post');

const createPost = async (req, res) => {
  try {
    const { title, content, coverImage, tags = [] } = req.body || {};

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }

    const post = new Post({
      title: title.trim(),
      content,
      coverImage,
      tags,
      author: req.user._id
    });

    await post.save();

    return res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
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

module.exports = { createPost };
