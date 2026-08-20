import { Tags } from "lucide-react";
import { REFERENSI_TABLES } from "@/lib/referensi-catalog";

export default function ReferensiIndexPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Referensi</h1>
      <p className="text-sm text-slate-500 mb-6">
        Kelola daftar kode & uraian yang dipakai sebagai pilihan pada form data siswa
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REFERENSI_TABLES.map((item) => (
          <a
            key={item.slug}
            href={`/referensi/${item.slug}`}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
              <Tags className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">{item.label}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
