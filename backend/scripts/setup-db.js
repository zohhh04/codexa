/**
 * Codexa AI — database bootstrap.
 *
 * Creates the `codexa` database with the Phase 9 collections, JSON-schema
 * validators and indexes. Safe to re-run (idempotent).
 *
 * Usage:
 *   npm run db:setup
 *   MONGODB_URI=mongodb://127.0.0.1:27017/codexa npm run db:setup
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codexa';

const validators = {
  users: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'passwordHash'],
      properties: {
        name: { bsonType: 'string', minLength: 1, maxLength: 100 },
        email: {
          bsonType: 'string',
          pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
        },
        passwordHash: { bsonType: 'string', minLength: 1 },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  projects: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'title', 'language', 'sourceCode'],
      properties: {
        userId: { bsonType: 'objectId' },
        title: { bsonType: 'string', minLength: 1, maxLength: 200 },
        language: { bsonType: 'string' },
        sourceCode: { bsonType: 'string', maxLength: 500000 },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  analyses: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId'],
      properties: {
        userId: { bsonType: 'objectId' },
        projectId: { bsonType: ['objectId', 'null'] },
        sourceCode: { bsonType: 'string', maxLength: 20000 },
        language: { bsonType: 'string' },
        diagnostics: { bsonType: 'array' },
        stats: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  practiceattempts: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'questionId', 'submittedAnswer'],
      properties: {
        userId: { bsonType: 'objectId' },
        questionId: { bsonType: 'string' },
        submittedAnswer: { bsonType: 'string' },
        result: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  submissions: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'problemId'],
      properties: {
        userId: { bsonType: 'objectId' },
        problemId: { bsonType: 'string' },
        language: { bsonType: 'string' },
        sourceCode: { bsonType: 'string', maxLength: 200000 },
        verdict: { bsonType: 'string' },
        passed: { bsonType: ['int', 'long', 'double'] },
        total: { bsonType: ['int', 'long', 'double'] },
        timeMs: { bsonType: ['int', 'long', 'double'] },
        createdAt: { bsonType: 'date' },
      },
    },
  },
};

const indexes = {
  users: [[{ email: 1 }, { unique: true, name: 'uniq_email' }]],
  projects: [[{ userId: 1, updatedAt: -1 }, { name: 'by_user' }]],
  analyses: [
    [{ userId: 1, createdAt: -1 }, { name: 'by_user' }],
    [{ projectId: 1 }, { name: 'by_project' }],
  ],
  practiceattempts: [[{ userId: 1, createdAt: -1 }, { name: 'by_user' }]],
  submissions: [
    [{ userId: 1, createdAt: -1 }, { name: 'by_user' }],
    [{ userId: 1, problemId: 1 }, { name: 'by_user_problem' }],
  ],
};

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, { validator: validators[name], validationLevel: 'moderate' });
    console.log(`  + created collection ${name}`);
  } else {
    await db.command({ collMod: name, validator: validators[name], validationLevel: 'moderate' });
    console.log(`  = updated validator on ${name}`);
  }
  for (const [keys, options] of indexes[name] || []) {
    await db.collection(name).createIndex(keys, options);
    console.log(`    · index ${options.name} ${JSON.stringify(keys)}`);
  }
}

async function main() {
  console.log(`[codexa] connecting to ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  console.log(`[codexa] bootstrapping database "${db.databaseName}"`);
  for (const name of Object.keys(validators)) {
    await ensureCollection(db, name);
  }
  const collections = await db.listCollections().toArray();
  console.log(`[codexa] done. collections: ${collections.map((c) => c.name).join(', ')}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[codexa] db setup failed:', err.message);
  process.exit(1);
});
