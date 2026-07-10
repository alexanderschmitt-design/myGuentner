#!/usr/bin/env node
/**
 * Bootstrap script — creates a Supabase user directly via the Admin API.
 *
 * Usage:
 *   node scripts/create-user.mjs <email> <password>
 *
 * Env: SUPABASE_URL, SUPABASE_SECRET_KEY  (from .env)
 *
 * Use this once to create the first admin user. Subsequent users can be created
 * via POST /api/admin/users (which requires authentication).
 */

import 'dotenv/config'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Usage: node scripts/create-user.mjs <email> <password>')
  process.exit(1)
}
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env')
  process.exit(1)
}

const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'User-Agent': 'myGPC-bootstrap/1.0'
  },
  body: JSON.stringify({ email, password, email_confirm: true })
})

if (!res.ok) {
  const detail = await res.text().catch(() => '')
  console.error(`Failed (${res.status}):`, detail.slice(0, 500))
  process.exit(1)
}

const data = await res.json()
console.log(`OK - user created: ${data.email} (id=${data.id})`)
