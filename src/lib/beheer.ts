import { supabase } from './supabase';

// Alleen voor beheerders (tabel beheerders). De database controleert dat zelf; de app laat het scherm alleen zien.

export interface Planning {
  id: number;
  modelId: string;
  /** Unix-tijd in ms */
  geldigVanaf: number;
  aangekondigd: number;
  toelichting: string;
}

export interface ModelKort {
  id: string;
  naam: string;
  omschrijving: string;
  commissie: number;
}

export async function laadVerdienmodellen(): Promise<{ actief: string | null; planning: Planning[]; modellen: ModelKort[] }> {
  const [actief, planning, modellen] = await Promise.all([
    supabase.rpc('actief_verdienmodel'),
    supabase.from('verdienmodel_planning').select('*').order('geldig_vanaf', { ascending: false }).limit(20),
    supabase.from('verdienmodellen').select('id, naam, omschrijving, commissie_percentage').order('aangemaakt'),
  ]);
  const fout = actief.error ?? planning.error ?? modellen.error;
  if (fout) throw new Error(fout.message);
  return {
    actief: (actief.data as { id: string } | null)?.id ?? null,
    planning: (planning.data ?? []).map((p) => ({
      id: Number(p.id),
      modelId: String(p.model_id),
      geldigVanaf: new Date(p.geldig_vanaf).getTime(),
      aangekondigd: new Date(p.aangekondigd).getTime(),
      toelichting: String(p.toelichting ?? ''),
    })),
    modellen: (modellen.data ?? []).map((m) => ({ id: m.id, naam: m.naam, omschrijving: m.omschrijving, commissie: Number(m.commissie_percentage) })),
  };
}

/** Plant een verdienmodel in. De database weigert terugwerkende kracht en een hogere commissie binnen 15 dagen. */
export async function planVerdienmodel(modelId: string, vanaf: number, toelichting: string) {
  const { error } = await supabase.rpc('plan_verdienmodel', { p_model: modelId, p_vanaf: new Date(vanaf).toISOString(), p_toelichting: toelichting });
  // De meldingen van de database zijn al in gewone taal
  if (error) throw new Error(error.message);
}
