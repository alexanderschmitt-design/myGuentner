import { resolve } from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

dotenvConfig({ path: resolve(process.cwd(), '.env') })

const ref = process.env.SUPABASE_PROJECT_ID
const pwd = process.env.SUPABASE_PSW

const client = new pg.Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${ref}`,
  password: pwd,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

await client.connect()
const { rows } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('chat_conversations','chat_messages','rate_limit_events')
  ORDER BY table_name;
`)
console.log('Neue Tabellen:', rows.map(r => r.table_name).join(', ') || '(keine)')
await client.end()
