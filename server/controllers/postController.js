const Post = require('../models/Post');
const Tag = require('../models/Tag');

const isValidTagList = (tags) =>
  Array.isArray(tags) &&
  tags.every((tag) => typeof tag === 'string' && tag.trim().length > 0);

const getUniqueTagNames = (tags) => {
  const uniqueTagNames = new Map();

  tags.forEach((tag) => {
    const displayName = tag.trim();
    const normalizedName = displayName.toLowerCase();

    if (!uniqueTagNames.has(normalizedName)) {
      uniqueTagNames.set(normalizedName, displayName);
    }
  });

  return [...uniqueTagNames.entries()].map(([name, displayName]) => ({
    name,
    displayName
  }));
};

const findOrCreateTag = async (name) => {
  let tag = await Tag.findOne({ name });

  if (tag) {
    return tag;
  }

  const baseSlug = name
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tag';
  let slug = baseSlug;
  let suffix = 0;

  while (true) {
    const existingSlug = await Tag.findOne({ slug });

    if (existingSlug) {
      if (existingSlug.name === name) {
        return existingSlug;
      }

      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
      continue;
    }

    tag = new Tag({ name, slug });

    try {
      return await tag.save();
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      tag = await Tag.findOne({ name });

      if (tag) {
        return tag;
      }

      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
  }
};

const resolvePostTags = async (tags) => {
  const uniqueTagNames = getUniqueTagNames(tags);
  const tagDocuments = [];

  for (const { name } of uniqueTagNames) {
    tagDocuments.push(await findOrCreateTag(name));
  }

  return {
    names: uniqueTagNames.map(({ displayName }) => displayName),
    references: tagDocuments.map((tag) => tag._id)
  };
};

const serializePost = (post) => {
  const postObject = post.toObject();
  delete postObject.tagRefs;
  return postObject;
};

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

    if (!isValidTagList(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array of non-empty strings'
      });
    }

    const resolvedTags = await resolvePostTags(tags);
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
        tags: resolvedTags.names,
        tagRefs: resolvedTags.references,
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
      post: serializePost(post)
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
      posts: posts.map(serializePost)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search published posts by title
const searchPosts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search keyword'
      });
    }

    const posts = await Post.find({
      title: { $regex: q.trim(), $options: 'i' },
      isPublished: true
    })
      .populate('author', 'name username profileImage')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posts.length,
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
      post: serializePost(post)
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
      posts: posts.map(serializePost)
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

    if (hasUpdate('tags') && !isValidTagList(updates.tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array of non-empty strings'
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

    if (hasUpdate('isPublished')) {
      post.isPublished = updates.isPublished;
    }

    const resolvedTags = await resolvePostTags(
      hasUpdate('tags') ? updates.tags : post.tags
    );
    post.tags = resolvedTags.names;
    post.tagRefs = resolvedTags.references;

    await post.save();

    return res.status(200).json({
      success: true,
      post: serializePost(post)
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
  searchPosts,
  getPostBySlug,
  getMyPosts,
  updatePost,
  deletePost
};
