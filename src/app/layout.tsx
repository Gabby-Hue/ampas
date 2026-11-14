import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OculiCare NeuroFocus | Penapisan Performa Atensi Neurobehavioral",
  description: "Penapisan performa atensi dan instrumen rujukan awal dengan Continuous Performance Task dan validasi kuesioner WHO ASRS v1.1.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
