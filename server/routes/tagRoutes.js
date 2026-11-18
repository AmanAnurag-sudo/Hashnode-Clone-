const express = require('express');
const router = express.Router();

const {
  getTags,
  getPostsByTag
} = require('../controllers/tagController');

router.get('/', getTags);
router.get('/:slug/posts', getPostsByTag);

module.exports = router;
