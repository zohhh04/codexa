const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    console.log('[codexa] no MONGODB_URI set — skipping DB connection');
    return null;
  }
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`[codexa] mongodb connected to ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

module.exports = { connectDB };
