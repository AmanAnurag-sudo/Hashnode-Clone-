
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    coverImage: {
      type: String,
      default: ''
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    },
    tags: [{
      type: String,
      trim: true
    }],
    tagRefs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag'
    }],
    isPublished: {
      type: Boolean,
      default: function () {
        return this.status === 'published';
      }
    }
  },
  { timestamps: true }
);

postSchema.pre('init', function (document) {
  if (document.status === undefined) {
    document.status = document.isPublished ? 'published' : 'draft';
  }
});

postSchema.statics.publishedFilter = function () {
  return {
    $or: [
      { status: 'published' },
      { status: { $exists: false }, isPublished: true }
    ]
  };
};

module.exports = mongoose.model('Post', postSchema);

