import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase-project Woober in Frankfurt (eu-central-1), los van Woofer.
 * De publieke sleutel mag in de app; RLS beschermt de gegevens. De service_role-sleutel komt nooit in de app.
 * Een ander project (bijvoorbeeld om te testen) kies je met EXPO_PUBLIC_SUPABASE_URL en EXPO_PUBLIC_SUPABASE_KEY.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://hnvafpbxhkxpvwwsgoba.supabase.co';
const SLEUTEL = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_aGgIgKoMGR2GlF2e90_R2w_1P-JgoWz';

export const supabase = createClient(URL, SLEUTEL, {
  auth: {
    // Op iOS en Android zorgt expo-sqlite voor localStorage; op het web is die er al
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Op het web komt Google of Apple terug met een code in de adresbalk; in de app handelen we dat zelf af
    detectSessionInUrl: process.env.EXPO_OS === 'web',
    flowType: 'pkce',
  },
});
