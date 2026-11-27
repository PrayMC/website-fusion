import type { Metadata } from 'next';
import { Geist, Geist_Mono, IBM_Plex_Sans_KR } from 'next/font/google';
import { currentLang } from '@/lib/server-lang';
import { THEME_COLORS, THEME_KEY } from '@/lib/theme';
import './globals.css';

// Geist (DESIGN.md) for Latin text and numbers, IBM Plex Sans KR for the Korean Geist doesn't have. Only the weights
// Korean text is set in: each is ~94 @font-face rules in the CSS the first paint waits for, and bold is only ever digits
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const plex = IBM_Plex_Sans_KR({ weight: ['400', '500', '600'], preload: false, variable: '--font-plex' });

const serverName = process.env.NEXT_PUBLIC_SERVER_NAME || 'Fusion'; // || : a blank NEXT_PUBLIC_SERVER_NAME= too

export const metadata: Metadata = { title: `${serverName} Leaderboard` };

// the saved theme, else the device's, before the first paint, so a dark-mode visitor never sees a white flash; and
// the browser's bars in its background color. The meta is made here: where React puts one in <head> isn't certain to
// be before this script
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)}),d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);var m=document.createElement('meta');m.name='theme-color';m.content=d?${JSON.stringify(THEME_COLORS.dark)}:${JSON.stringify(THEME_COLORS.light)};document.head.appendChild(m)}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await currentLang();

  return (
    <html lang={lang} className={`${geist.variable} ${geistMono.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
