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

    const baseSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'post';
    let slug = baseSlug;
    let suffix = 0;
    let post;

    while (true) {
      if (await Post.exists({ slug })) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
        continue;
      }

      post = new Post({
        title: title.trim(),
        slug,
        content,
        coverImage,
        tags,
        author: req.user._id
      });

      try {
        await post.save();
        break;
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }
    }

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

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isPublished: true }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      isPublished: true
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    return res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const updates = req.body || {};
    const hasUpdate = (field) => Object.prototype.hasOwnProperty.call(updates, field);

    if (
      (hasUpdate('title') &&
        (typeof updates.title !== 'string' || !updates.title.trim())) ||
      (hasUpdate('content') &&
        (typeof updates.content !== 'string' || !updates.content.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title and content must be non-empty strings'
      });
    }

    if (hasUpdate('tags') && !Array.isArray(updates.tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }

    if (hasUpdate('isPublished') && typeof updates.isPublished !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isPublished must be a boolean'
      });
    }

    if (hasUpdate('title')) {
      post.title = updates.title.trim();
    }

    if (hasUpdate('content')) {
      post.content = updates.content;
    }

    if (hasUpdate('coverImage')) {
      post.coverImage = updates.coverImage;
    }

    if (hasUpdate('tags')) {
      post.tags = updates.tags;
    }

    if (hasUpdate('isPublished')) {
      post.isPublished = updates.isPublished;
    }

    await post.save();

    return res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostBySlug,
  getMyPosts,
  updatePost,
  deletePost
};
