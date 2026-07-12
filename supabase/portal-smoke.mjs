// Portal E2E smoke against the LOCAL stack: for each portal, exercise the exact
// backend contract the app's route guard + data layer rely on —
//   login -> get_user_role (routing) -> an authorized data read.
// Plus the lodge custom-auth flow (login -> validate session).
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON = process.env.ANON_KEY
if (!ANON) { console.error('Set ANON_KEY.'); process.exit(1) }
const PW = 'Test1234!'
const FN = `${URL}/functions/v1`

let pass = 0, fail = 0
const check = (n, c, d) => c ? (console.log(`  \x1b[32mPASS\x1b[0m ${n}`), pass++) : (console.log(`  \x1b[31mFAIL\x1b[0m ${n} — ${d}`), fail++)

async function portal(email, expectedRole) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s, error: e1 } = await c.auth.signInWithPassword({ email, password: PW })
  if (e1) return check(`${email} login`, false, e1.message)
  check(`${email} login`, true)
  const { data: role, error: e2 } = await c.rpc('get_user_role', { input_user_id: s.user.id })
  check(`${email} routes as '${expectedRole}'`, role === expectedRole, `got '${role}' (${e2?.message || ''})`)
  // Authorized read: a user can always read their own public.users row (RLS).
  const { data: me, error: e3 } = await c.from('users').select('email, role_id, organization_id').eq('user_id', s.user.id).maybeSingle()
  check(`${email} can read own profile`, !!me && !e3, e3?.message || 'no row')
  return s
}

async function main() {
  console.log('\n— Supabase-auth portals (login -> role -> read) —')
  await portal('superadmin@test.local', 'super_admin')
  await portal('tourist@test.local', 'tourist')
  await portal('owner@test.local', 'owner')
  await portal('institutional@test.local', 'government_partner')
  await portal('agent@test.local', 'travel_agent')

  console.log('\n— Lodge custom auth (login -> validate session) —')
  const login = await fetch(`${FN}/lodge-login`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testlodge', password: PW }),
  }).then((r) => r.json())
  check('lodge-login returns a session token', !!login.sessionToken, JSON.stringify(login))
  if (login.sessionToken) {
    const val = await fetch(`${FN}/lodge-session-validate`, {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: login.sessionToken, lodgeId: login.lodge.id }),
    }).then((r) => r.json())
    check('lodge-session-validate accepts the issued token', val.valid === true, JSON.stringify(val))
    check('lodge-session-validate rejects a forged token', await fetch(`${FN}/lodge-session-validate`, {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: 'forged-token', lodgeId: login.lodge.id }),
    }).then((r) => r.status) === 401, 'expected 401')
  }

  console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} passed, ${fail} failed\x1b[0m`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1) })
