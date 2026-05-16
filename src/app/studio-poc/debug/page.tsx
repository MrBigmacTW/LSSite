import { notFound } from "next/navigation";
import { isValidPocKey } from "@/lib/poc/accessKey";
import DebugClient from "./DebugClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function DebugPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!isValidPocKey(params.key)) {
    notFound();
  }
  return <DebugClient accessKey={params.key!} />;
}
