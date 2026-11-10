import { DepartmentDetail } from "../../../../../components/department-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DepartmentDetail id={(await params).id} />;
}
