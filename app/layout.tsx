import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  // Makes every metadata URL absolute (canonical, Open Graph images) on the live domain.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR }],
  creator: AUTHOR,
  keywords: [
    'lithophane',
    'lithophane cube',
    'lithophane lamp',
    'lithophane generator',
    'lithophane box',
    '3D printing',
    'STL generator',
    'photo lamp',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1115',
  colorScheme: 'dark',
};

// Cookieless page-view counts from our own Umami (stats.merope.dev). Inlined at
// build time; only the production build sets it, so local builds count nothing.
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {UMAMI_WEBSITE_ID && (
          <script
            defer
            src="https://stats.merope.dev/p.js"
            data-website-id={UMAMI_WEBSITE_ID}
            data-do-not-track="true"
          />
        )}
      </body>
    </html>
  );
}
