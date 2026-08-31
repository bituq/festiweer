// Het festivalregister: de volgorde is ook de volgorde op de landingspagina.
import type { Editie } from '../scripts/lib/editie';

export const SLUGS = ['lowlands', 'draaimolen'] as const;

export async function laadEditie(slug: string): Promise<Editie> {
  const mod = await import(`./${slug}/editie.ts`);
  return mod.EDITIE;
}
