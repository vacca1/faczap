import { SupabaseClient } from '@supabase/supabase-js'

// DEV BYPASS — quando auth está desativado, retorna um user/account fake
// para que as API routes funcionem sem login.
// Em produção, remover este arquivo e usar auth real.

const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@fatorzap.local',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { full_name: 'Dev User' },
  created_at: new Date().toISOString(),
} as const

const DEV_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Returns the authenticated user, falling back to a dev user
 * when auth is disabled (dev mode).
 */
export async function getAuthUserOrDev(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { user, devMode: false }
  // AUTH DESATIVADO — modo desenvolvimento
  return { user: DEV_USER as any, devMode: true }
}

/**
 * Resolves the account_id for the current user.
 * In dev mode, ensures a dev account exists and returns its id.
 */
export async function resolveAccountId(supabase: SupabaseClient, userId: string) {
  // Try to find existing account
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (account) return account.id

  // In dev mode, create a dev account
  const { data: newAccount, error } = await supabase
    .from('accounts')
    .upsert({
      id: DEV_ACCOUNT_ID,
      name: 'FatorZap Dev',
      owner_user_id: userId,
    }, { onConflict: 'id' })
    .select('id')
    .single()

  if (error) {
    console.warn('[dev-auth] Could not create dev account:', error.message)
    return DEV_ACCOUNT_ID
  }
  return newAccount.id
}
