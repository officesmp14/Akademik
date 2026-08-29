"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

/** Render HTML soal (dari RichTextEditor) dengan sanitasi -- boleh berisi
 *  <strong>, warna teks, <table>, dan <img>. Sanitasi dijalankan di
 *  browser (komponen client), jadi render pertama (SSR) sengaja kosong
 *  lalu terisi setelah mount supaya tidak ada HTML mentah yang lolos ke
 *  server-rendered markup. */
export default function RichTextView({ html, className = "" }: { html: string; className?: string }) {
  const [clean, setClean] = useState<string | null>(null);

  useEffect(() => {
    setClean(
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "em", "u", "s", "span",
          "table", "thead", "tbody", "tr", "th", "td",
          "ul", "ol", "li", "img",
        ],
        ALLOWED_ATTR: ["style", "src", "alt", "width", "height", "colspan", "rowspan"],
      })
    );
  }, [html]);

  if (clean === null) return null;

  return <div className={`rich-text-content ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
