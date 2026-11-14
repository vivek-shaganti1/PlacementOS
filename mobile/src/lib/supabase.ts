import 'react-native-get-random-values'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import * as aesjs from 'aes-js'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

/**
 * Where the session lives on the phone. The device keychain (SecureStore) only holds small values, and a session is
 * larger, so the session is encrypted with a random AES-256 key: the key goes in the keychain, the ciphertext in
 * ordinary app storage. This is the pattern Supabase documents for Expo.
 */
class EncryptedStorage {
  private async encrypt(key: string, value: string) {
    const aesKey = crypto.getRandomValues(new Uint8Array(32))
    const cipher = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1))
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(aesKey))
    return aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)))
  }
  private async decrypt(key: string, value: string) {
    const hex = await SecureStore.getItemAsync(key)
    if (!hex) return null
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hex), new aesjs.Counter(1))
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)))
  }
  async getItem(key: string) {
    const stored = await AsyncStorage.getItem(key)
    return stored ? this.decrypt(key, stored) : null
  }
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, await this.encrypt(key, value))
  }
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key)
    await SecureStore.deleteItemAsync(key)
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: new EncryptedStorage(), autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})

// Tokens refresh only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
