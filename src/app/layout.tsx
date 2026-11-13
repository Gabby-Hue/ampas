import type { Metadata } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import "./globals.css";
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });
const notoSans = Noto_Sans({ variable: "--font-noto", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = {
  title: "OculiCare NeuroFocus | Penapisan Performa Atensi Neurobehavioral",
  description: "Penapisan performa atensi dan instrumen rujukan awal dengan Continuous Performance Task dan validasi kuesioner WHO ASRS v1.1.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning className={`${figtree.variable} ${notoSans.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('oculicare_theme');
                if (saved === 'light' || saved === 'dark') {
                  document.documentElement.setAttribute('data-theme', saved);
                } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
