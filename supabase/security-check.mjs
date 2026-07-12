// Security regression suite for the production-hardening changes. Runs against
// the LOCAL stack (`supabase start`) after `seed-local.mjs`. Exits non-zero if
// any check fails.
//
//   SUPABASE_URL=http://127.0.0.1:54321 ANON_KEY=<anon> node supabase/security-check.mjs
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON = process.env.ANON_KEY
if (!ANON) { console.error('Set ANON_KEY (from `supabase status`).'); process.exit(1) }
const FN = `${URL}/functions/v1`
const PW = 'Test1234!'

let pass = 0, fail = 0
const ok = (name) => { console.log(`  \x1b[32mPASS\x1b[0m ${name}`); pass++ }
const bad = (name, detail) => { console.log(`  \x1b[31mFAIL\x1b[0m ${name} — ${detail}`); fail++ }
const check = (name, cond, detail) => cond ? ok(name) : bad(name, detail)

async function callFn(name, { token, body } = {}) {
  const headers = { apikey: ANON, 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${FN}/${name}`, { method: 'POST', headers, body: JSON.stringify(body || {}) })
  return res.status
}

async function login(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: PW })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return data.session.access_token
}

async function main() {
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const touristJwt = await login('tourist@test.local')
  const adminJwt = await login('superadmin@test.local')

  console.log('\n— Lodge credential exposure —')
  {
    const { error } = await anon.from('lodges').select('password_hash').limit(1)
    check('anon cannot select lodges.password_hash (column removed)', !!error, 'expected an error, got none')
  }
  {
    const { data, error } = await anon.from('lodge_credentials').select('*').limit(1)
    check('anon cannot read lodge_credentials', !!error || (data && data.length === 0),
      `got ${JSON.stringify(data)}`)
  }
  {
    const { error } = await anon.from('lodge_sessions')
      .insert({ lodge_id: '11111111-1111-1111-1111-111111111111', session_token: 'forged', expires_at: '2099-01-01' })
    check('anon cannot forge a lodge_sessions row', !!error, 'insert unexpectedly succeeded')
  }

  console.log('\n— Lodge login (server-side bcrypt) —')
  check('lodge-login accepts correct password', await callFn('lodge-login', { body: { username: 'testlodge', password: PW } }) === 200, 'expected 200')
  check('lodge-login rejects wrong password', await callFn('lodge-login', { body: { username: 'testlodge', password: 'wrong' } }) === 401, 'expected 401')

  console.log('\n— Privileged user-creation functions —')
  for (const fn of ['create-owner-user', 'create-partner-user']) {
    check(`${fn} rejects anon-only (no user JWT)`, await callFn(fn, { body: {} }) === 401, 'expected 401')
    check(`${fn} rejects a tourist (non-admin)`, await callFn(fn, { token: touristJwt, body: {} }) === 403, 'expected 403')
    const adminStatus = await callFn(fn, { token: adminJwt, body: {} })
    check(`${fn} lets an admin through the gate`, adminStatus !== 401 && adminStatus !== 403, `got ${adminStatus}`)
  }
  check('org-invite-user rejects a tourist (non-admin)', await callFn('org-invite-user', { token: touristJwt, body: { organization_id: '00000000-0000-0000-0000-000000000000', email: 'x@y.z', job_role: 'org_admin', password: 'abcd1234' } }) === 403, 'expected 403')
  check('create-agent-user rejects anon-only', await callFn('create-agent-user', { body: {} }) === 401, 'expected 401')
  check('create-agent-user rejects a tourist', await callFn('create-agent-user', { token: touristJwt, body: { name: 'a', email: 'a@b.c', password: 'abcd1234', organization_id: null } }) === 403, 'expected 403')

  console.log('\n— Removed backdoors —')
  check('reset-ktb-password is gone (404)', await callFn('reset-ktb-password', {}) === 404, 'expected 404')
  check('create-lodge-user is gone (404)', await callFn('create-lodge-user', {}) === 404, 'expected 404')

  console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} passed, ${fail} failed\x1b[0m`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error('SUITE ERROR:', e.message); process.exit(1) })
