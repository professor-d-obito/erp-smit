const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  console.log('[prepare-db] Detected PostgreSQL DATABASE_URL.');
  console.log('[prepare-db] Updating Prisma schema provider to "postgresql"...');
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema, 'utf8');

  try {
    console.log('[prepare-db] Pushing schema to PostgreSQL database...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });

    console.log('[prepare-db] Seeding database with roles and super admin...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    console.log('[prepare-db] Database push & seed completed successfully.');
  } catch (err) {
    console.warn('[prepare-db] Note: Schema push/seed had a notice or error:', err.message);
  }
} else {
  console.log('[prepare-db] Using SQLite database provider for local environment.');
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
}
