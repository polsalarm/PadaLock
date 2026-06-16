import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";

export const metadata: Metadata = {
  title: "PadaLock — Padala na may pangako",
  description:
    "Purpose-locked OFW remittance on Stellar. Send USDC home split into buckets — tuition, utility, medical, groceries, free cash. Only whitelisted merchants receive restricted buckets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Inter:wght@400;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-surface text-on-surface">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
