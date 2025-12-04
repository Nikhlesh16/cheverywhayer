import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HyperLocal - H3 Based Community',
  description: 'Interactive world map system with H3 hexagonal tiling',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
