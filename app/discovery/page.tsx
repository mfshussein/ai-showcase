import type { Metadata } from "next";
import { DiscoveryRoom } from "@/components/discovery/room";

export const metadata: Metadata = {
  title: "Discovery Engine · Cypher-One",
  description: "A guided discovery interview: from a vague pain to a quantified pain point, its root cause and a gated solution.",
};

export default function DiscoveryPage() {
  return <DiscoveryRoom slug="invoice-approvals" />;
}
