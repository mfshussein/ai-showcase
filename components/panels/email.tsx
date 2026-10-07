"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "./card";
import { stageExtras } from "@/lib/stage-extras";

/** Inbox preview: exactly what the alert email said. With `send`, the stage sends it once (presenter sessions) to the recipient chosen in the room. */
export function EmailPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const typedNow = useSyncExternalStore(stageExtras.subscribe, stageExtras.getRecipient, () => "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  useEffect(() => {
    if (props.send !== true) return;
    const typed = stageExtras.getRecipient().trim();
    if (!stageExtras.claimSend(String(props.sendKey ?? props.subject ?? "email"))) return;
    fetch("/api/alert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: typed || undefined }) })
      .then(async (r) => ({ status: r.status, body: (await r.json()) as { sent: boolean; to?: string; reason?: string } }))
      .then(({ body }) => {
        if (body.to) setSentTo(body.to);
        if (body.sent) {
          setDelivered(true);
          stageExtras.addControl({ detector: "alert.email", policyId: "FIN-08", action: "sent", detail: `Email sent to ${body.to}` });
        } else {
          stageExtras.addControl({ detector: "alert.email", policyId: "FIN-08", action: "skipped", detail: `Email not sent: ${body.reason ?? "unknown reason"}` });
        }
      })
      .catch(() => stageExtras.addControl({ detector: "alert.email", policyId: "FIN-08", action: "skipped", detail: "Email not sent: network error" }));
  }, [props.send, props.sendKey, props.subject]);

  const to = sentTo ?? (props.send === true && typedNow.trim() ? typedNow.trim() : String(props.to ?? ""));
  const rows: [string, string][] = [["From", String(props.from ?? "")], ["To", to], ["Subject", String(props.subject ?? "")]];
  return (
    <Card
      title={typeof props.title === "string" ? props.title : "Inbox"}
      titleRight={<span className="font-mono text-sm text-muted">{delivered ? "Delivered · " : ""}{typeof props.sentAt === "string" ? props.sentAt : ""}</span>}
    >
      <dl className="space-y-1 border-b border-line pb-3 text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted">{k}</dt>
            <dd className={k === "Subject" ? "font-semibold" : "font-mono text-[14px]"}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 text-[15px] leading-relaxed">
        {/* One element per line so each Arabic or English line takes its own direction. */}
        {String(props.text ?? "").split("\n").map((line, i) => (line.trim() ? <p key={i} dir="auto">{line.trim()}</p> : <div key={i} className="h-3" />))}
      </div>
    </Card>
  );
}
