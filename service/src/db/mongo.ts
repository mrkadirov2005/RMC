export {};

let MongoClient: any = null;
try {
  ({ MongoClient } = require('mongodb'));
} catch {
  // If dependency isn't installed yet, we keep the API running and just disable logging.
  MongoClient = null;
}

let client: any | null = null;
let connectPromise: Promise<any> | null = null;

function getMongoUri(): string {
  return String(process.env.MONGO_URI || '').trim();
}

function getMongoDbName(): string {
  return String(process.env.MONGO_DB || 'crm_logs').trim() || 'crm_logs';
}

async function getMongoClient(): Promise<any | null> {
  const uri = getMongoUri();
  if (!uri) return null;

  if (!MongoClient) return null;

  if (client) return client;
  if (!connectPromise) {
    const c = new MongoClient(uri, {
      // Keep these conservative; logging should be resilient but not hang forever.
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    connectPromise = c.connect().then(() => {
      client = c;
      return c;
    });
  }

  return connectPromise;
}

async function getMongoDb(): Promise<any | null> {
  const c = await getMongoClient();
  if (!c) return null;
  return c.db(getMongoDbName());
}

async function initMongo(): Promise<void> {
  const uri = getMongoUri();
  if (!uri) {
    console.warn('[mongo] MONGO_URI is not set; request logging to MongoDB is disabled.');
    return;
  }

  if (!MongoClient) {
    console.warn('[mongo] `mongodb` dependency is not installed; request logging to MongoDB is disabled.');
    return;
  }

  const db = await getMongoDb();
  if (!db) return;

  const col = db.collection('request_logs');

  // Helpful indexes for query/filtering in Mongo tools.
  await col.createIndex({ ts: -1 });
  await col.createIndex({ path: 1, ts: -1 });
  await col.createIndex({ username: 1, ts: -1 });
  await col.createIndex({ ip: 1, ts: -1 });
  await col.createIndex({ userType: 1, ts: -1 });

  // Optional TTL to automatically expire old logs.
  const ttlDays = Number(process.env.REQUEST_LOG_TTL_DAYS || 0);
  if (Number.isFinite(ttlDays) && ttlDays > 0) {
    await col.createIndex({ ts: 1 }, { expireAfterSeconds: Math.floor(ttlDays * 24 * 60 * 60) });
  }

  console.log('[mongo] Connected (request logs enabled).');
}

async function closeMongo(): Promise<void> {
  if (!client) return;
  try {
    await client.close();
  } finally {
    client = null;
    connectPromise = null;
  }
}

module.exports = {
  getMongoDb,
  initMongo,
  closeMongo,
};
