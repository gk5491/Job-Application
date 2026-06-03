import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  Saved: "bg-muted text-muted-foreground",
  Applied: "bg-info/15 text-info border border-info/30",
  Assessment: "bg-warning/15 text-warning border border-warning/30",
  Interview: "bg-warning/15 text-warning border border-warning/30",
  "Interview Round 1": "bg-warning/15 text-warning border border-warning/30",
  "Interview Round 2": "bg-warning/15 text-warning border border-warning/30",
  "HR Round": "bg-info/15 text-info border border-info/30",
  Offer: "bg-success/15 text-success border border-success/30",
  Rejected: "bg-destructive/15 text-destructive border border-destructive/30",
  "Not Contacted": "bg-muted text-muted-foreground",
  "Message Sent": "bg-info/15 text-info border border-info/30",
  "Follow-up Sent": "bg-warning/15 text-warning border border-warning/30",
  Replied: "bg-info/15 text-info border border-info/30",
  "Referral Given": "bg-success/15 text-success border border-success/30",
  "No Response": "bg-destructive/15 text-destructive border border-destructive/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const klass = tone[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        klass,
        className,
      )}
    >
      {status}
    </span>
  );
}
