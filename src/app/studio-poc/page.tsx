import { notFound } from "next/navigation";
import { isValidPocKey } from "@/lib/poc/accessKey";
import StudioClient from "./StudioClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function StudioPocPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!isValidPocKey(params.key)) {
    notFound();
  }
  return <StudioClient accessKey={params.key!} />;
}
