
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
    tags: [{
      type: String,
      trim: true
    }],
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);

