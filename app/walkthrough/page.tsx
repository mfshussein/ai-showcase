import { redirect } from "next/navigation";
import { demos } from "@/demos/registry";

export default function WalkthroughPage() {
  const first = demos.find((d) => d.status === "ready");
  redirect(first ? `/demo/${first.slug}?walk=1` : "/");
}
