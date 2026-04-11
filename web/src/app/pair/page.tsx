import { redirect } from "next/navigation";

export default async function PairPage(props: { searchParams?: Promise<{ device_id?: string | string[] }> }) {
  const sp = props.searchParams ? await props.searchParams : undefined;
  const deviceId = typeof sp?.device_id === "string" ? sp.device_id : "";
  if (deviceId) redirect(`/setup?device_id=${encodeURIComponent(deviceId)}`);
  redirect("/setup");
}
