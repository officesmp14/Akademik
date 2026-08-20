/** Susun daftar nomor halaman: selalu tampilkan halaman pertama & terakhir,
 *  jendela di sekitar halaman aktif, dan "..." untuk bagian yang dilompati. */
export function getPageNumbers(current: number, total: number): (number | "...")[] {
  const windowSize = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);

  if (end - start + 1 < windowSize) {
    if (start === 1) end = Math.min(total, start + windowSize - 1);
    else if (end === total) start = Math.max(1, end - windowSize + 1);
  }

  const pages: (number | "...")[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) {
    if (end < total - 1) pages.push("...");
    pages.push(total);
  }
  return pages;
}
