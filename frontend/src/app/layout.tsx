import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: "Meme'd | Campaign Payout Tracker", description: 'Creator campaign marketplace and milestone payout tracker.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
