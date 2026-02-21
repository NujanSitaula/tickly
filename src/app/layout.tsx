import { AuthProvider } from "@/contexts/AuthContext";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeLoader from "@/components/ThemeLoader";
import { ThemeProvider } from "@/contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tickly — Tasks & Projects",
  description: "Tickly (tickly.one) — Manage your tasks and projects",
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://tickly.one/#organization',
      name: 'Tickly',
      url: 'https://tickly.one',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://tickly.one/#website',
      url: 'https://tickly.one',
      name: 'Tickly',
      description: 'Manage your tasks and projects',
      publisher: { '@id': 'https://tickly.one/#organization' },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  const themeInitScript = `
(function() {
  var theme = localStorage.getItem('tickly_theme') || 'light';
  var scheme = localStorage.getItem('tickly_color_scheme') || 'blue';
  var resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  var root = document.documentElement;
  root.classList.remove('light', 'dark', 'light-theme', 'dark-theme', 'blue-theme', 'green-theme', 'purple-theme', 'red-theme', 'orange-theme');
  root.classList.add(resolved, resolved + '-theme', scheme + '-theme');
})();
`;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a
          href="#main-content"
          className="skip-link rounded bg-primary px-4 py-2 text-primary-foreground outline-none ring-2 ring-ring ring-offset-2 focus:z-[100] focus:clip-auto focus:fixed focus:left-4 focus:top-4 focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ThemeLoader />
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
