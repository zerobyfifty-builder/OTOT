// Local-only test seed: creates one login per portal against the LOCAL Supabase
// stack (`supabase start`). Idempotent — safe to re-run. Never point this at
// production; it uses the service-role key.
//
//   Usage (from repo root, with the local stack running):
//     SUPABASE_URL=http://127.0.0.1:54321 \
//     SERVICE_ROLE_KEY=<service_role key from `supabase status`> \
//     node supabase/seed-local.mjs
//
// Prints a table of the seeded credentials at the end.
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY
if (!SERVICE_ROLE_KEY) {
  console.error('Set SERVICE_ROLE_KEY (from `supabase status`).')
  process.exit(1)
}

const admin = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'Test1234!'
const TEST_LODGE_ID = '11111111-1111-1111-1111-111111111111'

async function roleId(name) {
  const { data, error } = await admin.from('roles').select('id').eq('name', name).single()
  if (error) throw new Error(`role ${name}: ${error.message}`)
  return data.id
}

async function upsertOrg(name, category) {
  const existing = await admin.from('organizations').select('id').eq('name', name).maybeSingle()
  if (existing.data?.id) return existing.data.id
  const { data, error } = await admin
    .from('organizations')
    .insert({ name, category, is_active: true })
    .select('id')
    .single()
  if (error) throw new Error(`org ${name}: ${error.message}`)
  return data.id
}

// Create (or fetch) an auth user, confirm email, then set role/org on public.users.
async function seedUser(email, roleName, organizationId) {
  let userId
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  })
  if (createErr) {
    if (!/registered|already/i.test(createErr.message)) throw createErr
    const { data: list } = await admin.auth.admin.listUsers()
    userId = list.users.find((u) => u.email === email)?.id
    if (!userId) throw new Error(`could not find existing ${email}`)
    await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true })
  } else {
    userId = created.user.id
  }
  // The on_auth_user_created trigger inserts a public.users row (user_id,email).
  const patch = { role_id: await roleId(roleName), email_verified: true }
  if (organizationId) patch.organization_id = organizationId
  const { error: updErr } = await admin.from('users').update(patch).eq('user_id', userId)
  if (updErr) throw new Error(`users update ${email}: ${updErr.message}`)
  return userId
}

async function main() {
  const ownerOrg = await upsertOrg('Test Plantation Co', 'owner')
  const govOrg = await upsertOrg('Test Tourism Board', 'government')

  await seedUser('superadmin@test.local', 'super_admin', null)
  await seedUser('tourist@test.local', 'tourist', null)
  await seedUser('owner@test.local', 'owner', ownerOrg)
  await seedUser('institutional@test.local', 'government_partner', govOrg)

  // Travel agent: GoTrue user + travel_agents row (email is the link).
  const agentEmail = 'agent@test.local'
  await seedUser(agentEmail, 'travel_agent', govOrg)
  const agentExists = await admin.from('travel_agents').select('id').eq('email', agentEmail).maybeSingle()
  if (!agentExists.data) {
    const { error } = await admin.from('travel_agents').insert({
      name: 'Test Agent', business_name: 'Test Travel Co', email: agentEmail,
      username: agentEmail, password_hash: '__supabase_auth__', organization_id: govOrg, is_active: true,
    })
    if (error) throw new Error(`travel_agents: ${error.message}`)
  }

  // Lodge: custom auth via the hardened server-side helper (bcrypt).
  const { error: lodgeErr } = await admin.rpc('set_lodge_password', {
    _lodge_id: TEST_LODGE_ID, _username: 'testlodge', _password: PASSWORD,
  })
  if (lodgeErr) throw new Error(`set_lodge_password: ${lodgeErr.message}`)

  console.log('\nSeeded local test accounts:')
  console.table([
    { portal: 'super admin', login: 'superadmin@test.local', password: PASSWORD },
    { portal: 'tourist', login: 'tourist@test.local', password: PASSWORD },
    { portal: 'owner', login: 'owner@test.local', password: PASSWORD },
    { portal: 'institutional', login: 'institutional@test.local', password: PASSWORD },
    { portal: 'travel agent', login: 'agent@test.local', password: PASSWORD },
    { portal: 'lodge (username)', login: 'testlodge', password: PASSWORD },
  ])
}

main().then(() => process.exit(0)).catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1) })
