import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: { absolute: "Hội Thánh" },
  description: "Ứng dụng thông tin và sinh hoạt của Hội Thánh",
  manifest: "/pwa/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Hội Thánh", statusBarStyle: "default" },
  icons: { icon: "/pwa/icon-192.png", apple: "/pwa/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#316b59" };
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
