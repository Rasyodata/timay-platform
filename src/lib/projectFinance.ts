import type { DynamicModule } from "@/types/modules";

/** Satış Tablosu'ndan (T-0036) dönem bazlı satış toplamları. */
export function salesByDonem(modules: DynamicModule[]) {
  const recs = (modules.find((m) => m.id === "mod-T-0036")?.records ?? []) as Array<Record<string, unknown>>;
  const map = new Map<string, number>();
  let total = 0;
  for (const r of recs) {
    const tutar = Number(r.tutar) || 0;
    total += tutar;
    const d = String(r.donem ?? "").trim();
    if (d) map.set(d, (map.get(d) ?? 0) + tutar);
  }
  return { map, total };
}

export interface HedefKarRow {
  donem: string;
  hedef: number;
  butce: number;
  gerceklesen: number; // Satış Tablosu'ndan (aynı dönem)
  kalan: number;
  aciklama: string;
}

/**
 * Hedef ve Kar Tablosu (T-0043) hedef/bütçe + Satış Tablosu (T-0036) gerçekleşen,
 * dönem bazlı birleştirilmiş görünüm. Gerçekleşen elle girilmez, satıştan gelir.
 */
export function hedefKarRows(modules: DynamicModule[]) {
  const targets = (modules.find((m) => m.id === "mod-T-0043")?.records ?? []) as Array<Record<string, unknown>>;
  const sales = salesByDonem(modules);
  const rows: HedefKarRow[] = targets.map((r) => {
    const donem = String(r.donem ?? "—");
    const hedef = Number(r.hedef_kar) || 0;
    const butce = Number(r.butce) || 0;
    const gerceklesen = sales.map.get(donem.trim()) ?? 0;
    return { donem, hedef, butce, gerceklesen, kalan: butce - gerceklesen, aciklama: String(r.aciklama ?? "") };
  });
  const totals = {
    hedef: rows.reduce((a, r) => a + r.hedef, 0),
    butce: rows.reduce((a, r) => a + r.butce, 0),
    gerceklesen: sales.total, // tüm satışlar
  };
  return { rows, totals, kalan: totals.butce - totals.gerceklesen };
}
