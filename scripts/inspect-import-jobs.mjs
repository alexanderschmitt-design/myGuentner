import { resolve } from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'
dotenvConfig({ path: resolve(process.cwd(), '.env') })
const client = new pg.Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${process.env.SUPABASE_PROJECT_ID}`,
  password: process.env.SUPABASE_PSW,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})
await client.connect()
const { rows } = await client.query(`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'import_jobs'
  ORDER BY ordinal_position;
`)
for (const r of rows) console.log(`  ${r.column_name.padEnd(20)} ${r.data_type.padEnd(20)} default=${r.column_default || '—'} null=${r.is_nullable}`)
await client.end()
