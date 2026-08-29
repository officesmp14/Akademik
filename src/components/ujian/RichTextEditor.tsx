"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/client";
import { Bold, TableIcon, ImageIcon, Rows3, Columns3, Trash2, Loader2, X } from "lucide-react";

const WARNA_PALET = [
  { label: "Hitam (default)", value: null },
  { label: "Merah", value: "#dc2626" },
  { label: "Biru", value: "#2563eb" },
  { label: "Hijau", value: "#16a34a" },
  { label: "Oranye", value: "#ea580c" },
  { label: "Ungu", value: "#9333ea" },
];

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md text-sm ${
        active
          ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dalamTabel = editor.isActive("table");

  async function handleUploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();

    const ext = file.name.split(".").pop() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("ujian-gambar").upload(path, file, {
      contentType: file.type,
    });

    if (error) {
      setUploading(false);
      setUploadError(error.message);
      return;
    }

    const { data } = supabase.storage.from("ujian-gambar").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
    setUploading(false);
  }

  return (
    <div className="border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 rounded-t-lg px-2 py-1.5 flex flex-wrap items-center gap-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Tebal"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <div className="flex items-center gap-1">
        {WARNA_PALET.map((w) => (
          <button
            key={w.label}
            type="button"
            title={w.label}
            onClick={() =>
              w.value
                ? editor.chain().focus().setColor(w.value).run()
                : editor.chain().focus().unsetColor().run()
            }
            className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
            style={{ backgroundColor: w.value ?? "#0f172a" }}
          />
        ))}
      </div>

      <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      {!dalamTabel ? (
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Sisipkan Tabel"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
      ) : (
        <>
          <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Tambah Baris">
            <Rows3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Tambah Kolom">
            <Columns3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Hapus Tabel">
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}

      <span className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Sisipkan Gambar">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadImage(file);
          e.target.value = "";
        }}
      />

      {uploadError && (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 ml-1">
          {uploadError}
          <button type="button" onClick={() => setUploadError(null)}>
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextStyle, Color, TableKit.configure({ table: { resizable: false } }), Image],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "rich-text-content min-h-[110px] px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  if (!editor) {
    return (
      <div className="w-full rounded-lg border border-slate-300 dark:border-slate-600 min-h-[150px] animate-pulse bg-slate-50 dark:bg-slate-800" />
    );
  }

  return (
    <div className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
