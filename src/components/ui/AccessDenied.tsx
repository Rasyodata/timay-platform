import { ShieldAlert } from "lucide-react";

export default function AccessDenied({ detail }: { detail?: string }) {
  return (
    <div className="mx-auto max-w-md p-6 md:p-10">
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-critical/30 bg-critical/10 text-critical">
          <ShieldAlert size={26} />
        </span>
        <h2 className="text-lg font-bold text-ink">403 — Erişim Reddedildi</h2>
        <p className="text-sm text-muted">
          {detail ?? "Bu içeriği görüntüleme yetkiniz yok. Rolünüz bu modüle/sayfaya erişim için yetersiz."}
        </p>
        <p className="mt-1 text-[11px] text-faint">
          Gerçek sistemde bu kısıt yalnızca arayüzde değil, sunucu (API) tarafında da zorlanır.
        </p>
      </div>
    </div>
  );
}
