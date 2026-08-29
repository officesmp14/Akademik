/** Buang semua tag HTML, dipakai untuk preview ringkas (daftar soal, dialog
 *  konfirmasi hapus) yang tidak butuh format lengkap. */
export function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Konten Tiptap kosong ditulis sebagai "<p></p>" -- bukan string kosong --
 *  jadi validasi "wajib diisi" perlu cek teks & gambar, bukan cuma string. */
export function isRichTextEmpty(html: string): boolean {
  return stripHtml(html).length === 0 && !html.includes("<img");
}
