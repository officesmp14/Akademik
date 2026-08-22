import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Induk Siswa",
  description: "Aplikasi pengelolaan data induk siswa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Terapkan tema tersimpan SEBELUM React hydrate, supaya tidak ada
            kedipan (flash) tampilan terang sesaat sebelum berubah ke gelap.
            Berlaku di semua halaman (termasuk /login yang di luar DashboardShell). */}
        <Script id="apply-theme" strategy="beforeInteractive">
          {`try {
  var theme = localStorage.getItem('theme');
  var dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
