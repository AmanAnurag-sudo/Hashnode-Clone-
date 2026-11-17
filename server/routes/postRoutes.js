const express = require('express');
const router = express.Router();

const {
  createPost,
  getPosts,
  getPostBySlug,
  getMyPosts,
  updatePost,
  deletePost
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', getPosts);
router.get('/mine', authMiddleware, getMyPosts);
router.get('/:slug', getPostBySlug);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);
router.post('/', authMiddleware, createPost);

module.exports = router;
