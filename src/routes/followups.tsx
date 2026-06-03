import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { logActivity, setDB, uid, useDB, type Followup, companyName, employeeName } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Trash2, BellRing, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/followups")({
  head: () => ({ meta: [{ title: "Follow-ups — JobHunt CRM" }] }),
  component: FollowupsPage,
});

type TabType = "all" | "due" | "upcoming" | "completed";

function FollowupsPage() {
  const db = useDB((d) => d);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const today = new Date().toISOString().slice(0, 10);

  const due = db.followups.filter((f) => f.nextFollowupDate <= today && f.status !== "Done");
  const upcoming = db.followups.filter((f) => f.nextFollowupDate > today && f.status !== "Done");
  const done = db.followups.filter((f) => f.status === "Done");

  const visibleRows = (() => {
    if (activeTab === "due") return due;
    if (activeTab === "upcoming") return upcoming;
    if (activeTab === "completed") return done;
    return db.followups;
  })();

  const remove = (id: string) => {
    setDB((db) => { db.followups = db.followups.filter((f) => f.id !== id); });
    toast.success("Removed");
  };
  const markDone = (id: string) => {
    setDB((db) => {
      const i = db.followups.findIndex((f) => f.id === id);
      if (i >= 0) db.followups[i].status = "Done";
    });
    logActivity("Follow-up completed", "followup", id);
    toast.success("Marked done");
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "all", label: "All", count: db.followups.length },
    { key: "due", label: "Due Today", count: due.length },
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "completed", label: "Completed", count: done.length },
  ];

  return (
    <>
      <PageHeader
        title="Follow-Up Management"
        description="Stay on top of every outreach."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Schedule Follow-up</Button>}
      />

      {due.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 mb-6 flex items-center gap-3">
          <BellRing className="h-5 w-5 text-warning" />
          <div className="text-sm">
            <span className="font-semibold text-warning">{due.length} follow-up{due.length > 1 ? "s" : ""} due today</span>
            <span className="text-muted-foreground"> — check the list below.</span>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 p-1 bg-muted/40 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full text-xs px-1.5 ${
                t.key === "due" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{employeeName(db, f.employeeId)}</TableCell>
                <TableCell>{companyName(db, f.companyId)}</TableCell>
                <TableCell className="text-muted-foreground">{f.lastContactDate}</TableCell>
                <TableCell className={f.nextFollowupDate <= today && f.status !== "Done" ? "text-warning font-medium" : ""}>{f.nextFollowupDate}</TableCell>
                <TableCell><StatusBadge status={f.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {f.status !== "Done" && (
                      <Button size="icon" variant="ghost" onClick={() => markDone(f.id)} title="Mark done">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">
                  {activeTab === "due" ? "No overdue follow-ups." :
                   activeTab === "upcoming" ? "No upcoming follow-ups." :
                   activeTab === "completed" ? "No completed follow-ups yet." :
                   "No follow-ups scheduled yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FollowupDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function FollowupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const db = useDB((d) => d);
  const [employeeId, setEmployeeId] = useState("");
  const [last, setLast] = useState(new Date().toISOString().slice(0, 10));
  const [next, setNext] = useState("");
  const [status, setStatus] = useState("Pending");

  useEffect(() => {
    setEmployeeId(db.employees[0]?.id ?? "");
    setLast(new Date().toISOString().slice(0, 10));
    const d = new Date(); d.setDate(d.getDate() + 5);
    setNext(d.toISOString().slice(0, 10));
    setStatus("Pending");
  }, [open, db.employees]);

  const submit = () => {
    if (!employeeId) { toast.error("Add an employee first"); return; }
    const emp = db.employees.find((e) => e.id === employeeId)!;
    const f = { id: uid(), employeeId, companyId: emp.companyId, lastContactDate: last, nextFollowupDate: next, status };
    setDB((db) => { db.followups.unshift(f); });
    logActivity(`Follow-up scheduled with ${emp.name}`, "followup", f.id, emp.companyId);
    toast.success("Scheduled");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule follow-up</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{db.employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} — {companyName(db, e.companyId)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Last Contact</Label><Input type="date" value={last} onChange={(e) => setLast(e.target.value)} /></div>
            <div><Label>Next Follow-up</Label><Input type="date" value={next} onChange={(e) => setNext(e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Snoozed">Snoozed</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
