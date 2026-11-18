const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const Post = require('../models/Post');
const Tag = require('../models/Tag');

const normalizeTagName = (name) =>
  typeof name === 'string' ? name.trim().toLowerCase() : '';

const createTagSlug = (name) =>
  name.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tag';

const runMigration = async () => {
  if (!process.argv.includes('--apply')) {
    console.log(
      'No changes made. Run this script with --apply to migrate post tags.'
    );
    return;
  }

  await connectDB();

  try {
    await Tag.init();

    const [existingTags, postCursor] = await Promise.all([
      Tag.find().select('_id name slug').sort({ _id: 1 }).lean(),
      Post.find().select('_id tags tagRefs').lean().cursor()
    ]);

    const tagsByName = new Map();
    const tagsBySlug = new Map();
    let postsVisited = 0;
    let postsUpdated = 0;
    let tagsCreated = 0;

    const registerTag = (tag) => {
      const normalizedName = normalizeTagName(tag.name);

      if (normalizedName && !tagsByName.has(normalizedName)) {
        tagsByName.set(normalizedName, tag);
      }

      if (tag.slug) {
        tagsBySlug.set(tag.slug, tag);
      }
    };

    existingTags.forEach(registerTag);

    const findOrCreateTag = async (name) => {
      const cachedTag = tagsByName.get(name);

      if (cachedTag) {
        return cachedTag;
      }

      const existingTag = await Tag.findOne({ name });

      if (existingTag) {
        registerTag(existingTag);
        return existingTag;
      }

      const baseSlug = createTagSlug(name);
      let suffix = 0;

      while (true) {
        const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
        const cachedSlugTag = tagsBySlug.get(slug);
        const existingSlugTag = cachedSlugTag || await Tag.findOne({ slug });

        if (existingSlugTag) {
          registerTag(existingSlugTag);

          if (normalizeTagName(existingSlugTag.name) === name) {
            return existingSlugTag;
          }

          suffix += 1;
          continue;
        }

        try {
          const createdTag = await Tag.create({ name, slug });
          registerTag(createdTag);
          tagsCreated += 1;
          return createdTag;
        } catch (error) {
          if (error.code !== 11000) {
            throw error;
          }

          const tagWithName = await Tag.findOne({ name });

          if (tagWithName) {
            registerTag(tagWithName);
            return tagWithName;
          }

          const tagWithSlug = await Tag.findOne({ slug });

          if (!tagWithSlug) {
            throw error;
          }

          registerTag(tagWithSlug);

          if (normalizeTagName(tagWithSlug.name) === name) {
            return tagWithSlug;
          }

          suffix += 1;
        }
      }
    };

    try {
      for await (const post of postCursor) {
        postsVisited += 1;

        const tagNames = [
          ...new Set(
            (Array.isArray(post.tags) ? post.tags : [])
              .map(normalizeTagName)
              .filter(Boolean)
          )
        ];
        const referencesById = new Map();

        (Array.isArray(post.tagRefs) ? post.tagRefs : [])
          .filter(Boolean)
          .forEach((tagId) => referencesById.set(tagId.toString(), tagId));

        for (const tagName of tagNames) {
          const tag = await findOrCreateTag(tagName);
          referencesById.set(tag._id.toString(), tag._id);
        }

        const currentReferences = Array.isArray(post.tagRefs)
          ? post.tagRefs.filter(Boolean).map((tagId) => tagId.toString())
          : [];
        const updatedReferences = [...referencesById.keys()];
        const referencesChanged =
          currentReferences.length !== updatedReferences.length ||
          currentReferences.some((tagId, index) => tagId !== updatedReferences[index]);

        if (referencesChanged) {
          await Post.updateOne(
            { _id: post._id },
            { $set: { tagRefs: [...referencesById.values()] } },
            { timestamps: false }
          );
          postsUpdated += 1;
        }
      }
    } finally {
      await postCursor.close();
    }

    console.log(
      `Migration complete. Posts scanned: ${postsVisited}; ` +
      `posts updated: ${postsUpdated}; tags created: ${tagsCreated}.`
    );
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  runMigration().catch((error) => {
    console.error('Post tag migration failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = runMigration;
