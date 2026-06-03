import { notFound } from "next/navigation";
import { isValidPocKey } from "@/lib/poc/accessKey";
import PositionsAdminClient from "./PositionsAdminClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function PositionsAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!isValidPocKey(params.key)) {
    notFound();
  }
  return <PositionsAdminClient />;
}
