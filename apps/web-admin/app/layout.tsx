import type { Metadata } from "next";
import { Providers } from "../components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Gather · Member directory",
    template: "%s · Gather",
  },
  description: "A little more connected. Your community, in one place.",
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
