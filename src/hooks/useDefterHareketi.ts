import { useCallback } from "react";
import { useModules } from "@/context/ModulesContext";

const MOD = "mod-T-0086";
const today = () => new Date().toISOString().slice(0, 10);

export interface Hareket {
  tarih?: string;
  /** Kaynak defter: "Toplantı Defteri" | "Kasa Defteri" | "Görev Defteri" | … */
  kaynak: string;
  /** Kısa hareket başlığı. */
  hareket: string;
  /** İlgili varlık türü: "Proje" | "Kullanıcı" | "Cari" | "Dava" | "Avukat" | "Masraf" | … */
  ilgili_tur: string;
  /** İlgili varlık (ad/kod). */
  ilgili: string;
  tutar?: number;
  aciklama?: string;
  /** Tekrarlı kayıtta aynı kaynağı güncellemek için benzersiz anahtar (ör. "tutanak-<id>-proje"). */
  ref?: string;
}

/**
 * Defterler arası hareketi merkezi "Defter Hareketleri" (T-0086) tablosuna işler.
 * Aynı ref'li kayıt varsa günceller (çift kayıt olmaz), yoksa ekler.
 */
export function useDefterHareketi() {
  const { getModule, addRecord, updateRecord } = useModules();
  return useCallback(
    (h: Hareket) => {
      if (!h.ilgili || !h.ilgili.trim()) return;
      const data: Record<string, unknown> = {
        tarih: h.tarih || today(),
        kaynak: h.kaynak,
        hareket: h.hareket,
        ilgili_tur: h.ilgili_tur,
        ilgili: h.ilgili,
        tutar: h.tutar ?? "",
        aciklama: h.aciklama || "",
        ref: h.ref || "",
      };
      const recs = (getModule(MOD)?.records ?? []) as Array<Record<string, unknown>>;
      const existing = h.ref ? recs.find((r) => String(r.ref) === h.ref) : undefined;
      if (existing) updateRecord(MOD, String(existing.id), data);
      else addRecord(MOD, data);
    },
    [getModule, addRecord, updateRecord],
  );
}
