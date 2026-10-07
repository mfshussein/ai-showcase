import { demos } from "@/demos/registry";
import { getSession } from "@/lib/session";
import { Gallery } from "@/components/gallery/gallery";

export default async function Home() {
  const session = await getSession();
  const first = demos.find((d) => d.status === "ready");
  return <Gallery demos={demos} presenter={session?.role === "presenter"} walkthroughHref={first ? `/demo/${first.slug}?walk=1` : undefined} />;
}
