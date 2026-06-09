import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lithophane Cube Maker',
  description:
    'Turn 5 images into a 3D-printable backlit lithophane cube — frame, panels and snap-fit base.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
