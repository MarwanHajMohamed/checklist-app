const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(uri, {
    autoIndex: true,
  });
  logger.info('MongoDB connected');
}

module.exports = { connectDB };
