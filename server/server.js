const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const tagRoutes = require('./routes/tagRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hashnode backend is running!'
  });
});

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/tags', tagRoutes);

// Unknown route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
