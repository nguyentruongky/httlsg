import type { Metadata } from "next";
import { WorshipViberDraftPage } from "../../../components/calendar/worship-viber-draft-page";
export const metadata: Metadata = {
  title: "Bản nháp Viber",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <WorshipViberDraftPage requestId={(await params).id} />;
}
