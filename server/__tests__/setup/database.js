import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import mongoose from 'mongoose';

process.env.SECRET = 'test-secret';
process.env.GEMINI_API_KEY = 'test-key';

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${process.env.VITEST_POOL_ID}` });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
