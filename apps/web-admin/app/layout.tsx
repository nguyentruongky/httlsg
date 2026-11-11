import type { Metadata, Viewport } from "next";
import { Providers } from "../components/providers";
import "./globals.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  title: {
    default: "Gather · Member directory",
    template: "%s · Gather",
  },
  description: "A little more connected. Your community, in one place.",
  icons: {
    icon: "/pwa/icon-192.png",
    apple: "/pwa/apple-touch-icon.png",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
