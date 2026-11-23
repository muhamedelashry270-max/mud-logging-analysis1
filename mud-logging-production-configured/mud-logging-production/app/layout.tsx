import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Mud Logging Analysis',
  description: 'Hydrocarbon interpretation calculator based on the supplied mud logging workbook.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
