import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function startMongo({ provide }) {
  const mongod = await MongoMemoryServer.create();
  provide('mongoUri', mongod.getUri());
  return () => mongod.stop();
}
