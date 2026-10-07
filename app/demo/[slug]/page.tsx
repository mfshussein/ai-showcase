import { notFound } from "next/navigation";
import { getDemo, nextReadyDemo } from "@/demos/registry";
import { goldens } from "@/demos/goldens";
import { parseGolden } from "@/lib/events";
import { getSession } from "@/lib/session";
import { Stage } from "@/components/stage/stage";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DemoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const manifest = getDemo(slug);
  const raw = goldens[slug];
  if (!manifest || manifest.status !== "ready" || !raw) notFound();
  const golden = parseGolden(raw);
  const session = await getSession();
  return (
    <Stage manifest={manifest} golden={golden} presenter={session?.role === "presenter"} walk={sp.walk === "1"} nextSlug={nextReadyDemo(slug)?.slug} />
  );
}
