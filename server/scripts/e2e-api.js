const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

Object.assign(process.env, {
  SECRET: 'e2e-secret',
  GEMINI_API_KEY: 'e2e-key',
  JOB_API_URL: 'http://127.0.0.1:9',
  JOB_API_APP_ID: 'e2e',
  JOB_API_KEY: 'e2e',
  HACKATHONS_API_URL: 'http://127.0.0.1:9',
});

MongoMemoryServer.create()
  .then((mongod) => mongoose.connect(mongod.getUri()))
  .then(() => require('../app').listen(process.env.PORT));
