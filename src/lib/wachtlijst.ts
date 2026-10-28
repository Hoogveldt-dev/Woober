import type { Rol } from '../types';
import { supabase } from './supabase';

// Wachtlijst: wie het wil weten zodra Woober in de buurt start. Beheerders zien de lijst per postcodegebied.

export async function staOpWachtlijst(): Promise<boolean> {
  const { data: sessie } = await supabase.auth.getSession();
  const id = sessie.session?.user.id;
  if (!id) return false;
  const { data, error } = await supabase.from('wachtlijst').select('gebruiker_id').eq('gebruiker_id', id).maybeSingle();
  if (error) throw new Error('Kon de wachtlijst niet ophalen.');
  return data !== null;
}

export async function zetOpWachtlijst(rol: Rol, aan: boolean) {
  const { data: sessie } = await supabase.auth.getSession();
  const id = sessie.session?.user.id;
  if (!id) throw new Error('Je bent niet meer ingelogd.');
  const { error } = aan
    ? await supabase.from('wachtlijst').upsert({ gebruiker_id: id, rol })
    : await supabase.from('wachtlijst').delete().eq('gebruiker_id', id);
  if (error) throw new Error('Dat lukte niet. Probeer het nog eens.');
}
