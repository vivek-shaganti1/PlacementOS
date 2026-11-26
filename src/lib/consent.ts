import { supabase } from './supabase'

/** The privacy notice people agree to. Change it whenever the notice changes in substance: everyone is asked again. */
export const NOTICE_VERSION = '2026-11-25'
export type Age = 'adult' | 'guardian'

/** Records this person's agreement. Before the database has the table (migration 20261125) there is nothing to record to. */
export async function giveConsent(userId: string, age: Age): Promise<string | null> {
  const { error } = await supabase.from('consents').insert({ user_id: userId, notice_version: NOTICE_VERSION, age })
  return !error || error.code === '23505' || error.code === 'PGRST205' ? null : error.message
}

/** true: agreed to the current notice; false: still to ask; null: could not tell (never nag on a failure). */
export async function hasConsented(userId: string): Promise<boolean | null> {
  const { data, error } = await supabase.from('consents').select('id').eq('user_id', userId).eq('notice_version', NOTICE_VERSION).limit(1)
  return error ? null : data.length > 0
}
