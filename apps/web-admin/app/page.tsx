import Link from "next/link";
export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Hội Thánh</h1>
      <p>Ứng dụng thông tin và sinh hoạt của Hội Thánh.</p>
      <Link href="/client">Vào ứng dụng</Link>
    </main>
  );
}
