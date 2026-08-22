import { Tags } from "lucide-react";
import { REFERENSI_TABLES } from "@/lib/referensi-catalog";

export default function ReferensiIndexPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Referensi</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Kelola daftar kode & uraian yang dipakai sebagai pilihan pada form data siswa
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REFERENSI_TABLES.map((item) => (
          <a
            key={item.slug}
            href={`/referensi/${item.slug}`}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
              <Tags className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{item.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
