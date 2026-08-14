#!/usr/bin/env node
/**
 * Führt eine SQL-Migration gegen die Supabase-Postgres-DB aus.
 *
 * Setzt SUPABASE_PROJECT_ID und SUPABASE_PSW aus .env voraus. Versucht zuerst
 * die direkte Verbindung (db.<ref>.supabase.co:5432), fällt bei Netzwerkfehler
 * auf die üblichen EU-Pooler-Endpoints zurück (Güntner ist in Frankfurt).
 *
 * Usage:
 *   node scripts/run-migration.mjs supabase/migrations/20260812000001_....sql
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

dotenvConfig({ path: resolve(process.cwd(), '.env') })

const migrationPath = process.argv[2]
if (!migrationPath) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-sql>')
  process.exit(1)
}

const ref = process.env.SUPABASE_PROJECT_ID
const pwd = process.env.SUPABASE_PSW
if (!ref || !pwd) {
  console.error('SUPABASE_PROJECT_ID und SUPABASE_PSW müssen in .env gesetzt sein')
  process.exit(1)
}

const sql = readFileSync(resolve(process.cwd(), migrationPath), 'utf8')
console.log(`[migrate] Datei: ${migrationPath} (${sql.length} chars)`)

const candidates = [
  { label: 'direct',            host: `db.${ref}.supabase.co`,                          port: 5432, user: 'postgres' },
  { label: 'pooler eu-central', host: 'aws-0-eu-central-1.pooler.supabase.com',          port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-west',    host: 'aws-0-eu-west-1.pooler.supabase.com',             port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-central-session', host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` }
]

let lastErr = null
for (const cand of candidates) {
  const client = new pg.Client({
    host: cand.host,
    port: cand.port,
    user: cand.user,
    password: pwd,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  })
  try {
    console.log(`[migrate] Versuche ${cand.label} → ${cand.host}:${cand.port}`)
    await client.connect()
    console.log(`[migrate] Verbunden. Führe SQL aus …`)
    await client.query(sql)
    console.log(`[migrate] ✓ Migration erfolgreich via ${cand.label}`)
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error(`[migrate] ✗ ${cand.label}: ${err.message}`)
    lastErr = err
    try { await client.end() } catch {}
  }
}

console.error('[migrate] Alle Kandidaten fehlgeschlagen.')
console.error('[migrate] Letzter Fehler:', lastErr?.message)
process.exit(1)
