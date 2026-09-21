import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimpanUang — Catat Keuangan Semudah Chat — Langsung dari Telegram Kamu',
  description: 'SimpanUang adalah aplikasi manajemen keuangan pribadi modern Indonesia dengan integrasi Telegram Bot, multi-wallet, budget tracker, AI Financial Advisor, dan laporan instan.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#080C14] text-[#F8FAFC] selection:bg-[#0071E3] selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
