const Post = require('../models/Post');
const Tag = require('../models/Tag');

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serializePost = (post) => {
  const postObject = post.toObject();
  delete postObject.tagRefs;
  return postObject;
};

const getTags = async (req, res) => {
  try {
    const [tags, publishedPosts] = await Promise.all([
      Tag.find().sort({ name: 1 }).lean(),
      Post.find({ isPublished: true }).select('tags tagRefs').lean()
    ]);

    const tagIdsByName = new Map(
      tags.map((tag) => [tag.name.trim().toLowerCase(), tag._id.toString()])
    );
    const publishedPostCounts = new Map(
      tags.map((tag) => [tag._id.toString(), 0])
    );

    publishedPosts.forEach((post) => {
      const associatedTagIds = new Set(
        (post.tagRefs || []).map((tagId) => tagId.toString())
      );

      (post.tags || []).forEach((tagName) => {
        if (typeof tagName !== 'string') {
          return;
        }

        const tagId = tagIdsByName.get(tagName.trim().toLowerCase());

        if (tagId) {
          associatedTagIds.add(tagId);
        }
      });

      associatedTagIds.forEach((tagId) => {
        if (publishedPostCounts.has(tagId)) {
          publishedPostCounts.set(
            tagId,
            publishedPostCounts.get(tagId) + 1
          );
        }
      });
    });

    return res.status(200).json({
      success: true,
      tags: tags.map((tag) => ({
        name: tag.name,
        slug: tag.slug,
        publishedPostCount: publishedPostCounts.get(tag._id.toString())
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPostsByTag = async (req, res) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    const legacyTagName = new RegExp(
      `^\\s*${escapeRegex(tag.name)}\\s*$`,
      'i'
    );
    const posts = await Post.find({
      isPublished: true,
      $or: [
        { tagRefs: tag._id },
        { tags: { $regex: legacyTagName } }
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      tag: {
        name: tag.name,
        slug: tag.slug
      },
      posts: posts.map(serializePost)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getTags,
  getPostsByTag
};
