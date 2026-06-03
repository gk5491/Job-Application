import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, companyName } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Activity Timeline — JobHunt CRM" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const db = useDB((d) => d);
  const [q, setQ] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const filtered = db.activities.filter((a) => {
    if (q && !a.text.toLowerCase().includes(q.toLowerCase())) return false;
    if (companyFilter !== "all") {
      if (a.companyId && a.companyId !== companyFilter) return false;
      if (!a.companyId) {
        if (a.type === "employee") {
          const emp = db.employees.find((e) => e.id === a.refId);
          if (!emp || emp.companyId !== companyFilter) return false;
        } else if (a.type === "job") {
          const job = db.jobs.find((j) => j.id === a.refId);
          if (!job || job.companyId !== companyFilter) return false;
        } else if (a.type === "application") {
          const app = db.applications.find((ap) => ap.id === a.refId);
          if (!app || app.companyId !== companyFilter) return false;
        } else if (a.type === "followup") {
          const fu = db.followups.find((f) => f.id === a.refId);
          if (!fu || fu.companyId !== companyFilter) return false;
        } else if (a.type === "company") {
          if (a.refId !== companyFilter) return false;
        } else {
          return false;
        }
      }
    }
    return true;
  });

  const groups: Record<string, typeof filtered> = {};
  filtered.forEach((a) => {
    const d = new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    (groups[d] = groups[d] || []).push(a);
  });

  return (
    <>
      <PageHeader title="Activity Timeline" description="Complete history of your job hunt actions." />
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input placeholder="Search activity..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {db.companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {Object.keys(groups).length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">
          {companyFilter !== "all" ? `No activity found for ${companyName(db, companyFilter)}.` : "No activity yet."}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{date}</div>
            <ol className="relative border-l border-border ml-2 space-y-4">
              {items.map((a) => (
                <li key={a.id} className="pl-5 relative">
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="text-sm">{a.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.type}
                    {a.companyId && ` · ${companyName(db, a.companyId)}`}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </>
  );
}
