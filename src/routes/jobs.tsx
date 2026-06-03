import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  logActivity, setDB, uid, useDB, JOB_STATUSES, type Job, type JobStatus, companyName,
} from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { CopyButton } from "@/components/copy-button";
import { Plus, ExternalLink, Pencil, Trash2, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Jobs — JobHunt CRM" }] }),
  component: JobsPage,
});

function JobsPage() {
  const db = useDB((d) => d);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);

  const filtered = useMemo(() => {
    return db.jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (companyFilter !== "all" && j.companyId !== companyFilter) return false;
      if (q && !(`${j.title} ${companyName(db, j.companyId)}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [db, q, statusFilter, companyFilter]);

  const remove = (id: string) => {
    if (!confirm("Delete this job?")) return;
    setDB((db) => { db.jobs = db.jobs.filter((j) => j.id !== id); });
    toast.success("Job deleted");
  };

  const markApplied = (j: Job) => {
    setDB((db) => {
      const i = db.jobs.findIndex((x) => x.id === j.id);
      if (i >= 0) db.jobs[i].status = "Applied";
      // also add an application entry if not exists
      const exists = db.applications.some((a) => a.companyId === j.companyId && a.jobTitle === j.title);
      if (!exists) {
        db.applications.unshift({
          id: uid(), companyId: j.companyId, jobTitle: j.title,
          applicationDate: new Date().toISOString().slice(0, 10),
          status: "Applied",
        });
      }
    });
    logActivity(`Applied to ${j.title} at ${companyName(db, j.companyId)}`, "application");
    toast.success("Marked as applied");
  };

  return (
    <>
      <PageHeader
        title="Job Opportunities"
        description="Save links to roles you're interested in."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> Add Job</Button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title or company..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {db.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.title}</TableCell>
                <TableCell>{companyName(db, j.companyId)}</TableCell>
                <TableCell className="text-muted-foreground">{j.source || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{j.dateAdded}</TableCell>
                <TableCell><StatusBadge status={j.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {j.url && (
                      <Button size="icon" variant="ghost" asChild title="Open link">
                        <a href={j.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                    {j.url && <CopyButton value={j.url} variant="ghost" size="icon" />}
                    {j.status !== "Applied" && (
                      <Button size="icon" variant="ghost" title="Mark applied" onClick={() => markApplied(j)}>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(j); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No jobs found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <JobDialog open={open} onOpenChange={setOpen} editing={editing} />
    </>
  );
}

function JobDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Job | null }) {
  const companies = useDB((d) => d.companies);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<JobStatus>("Saved");
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setCompanyId(editing?.companyId ?? companies[0]?.id ?? "");
    setTitle(editing?.title ?? "");
    setUrl(editing?.url ?? "");
    setSource(editing?.source ?? "");
    setStatus(editing?.status ?? "Saved");
    setDateAdded(editing?.dateAdded ?? new Date().toISOString().slice(0, 10));
  }, [editing, open, companies]);

  const submit = () => {
    if (!companyId) { toast.error("Add a company first"); return; }
    if (!title.trim()) { toast.error("Title required"); return; }
    if (editing) {
      setDB((db) => {
        const i = db.jobs.findIndex((j) => j.id === editing.id);
        if (i >= 0) db.jobs[i] = { ...db.jobs[i], companyId, title, url, source, status, dateAdded };
      });
      toast.success("Job updated");
    } else {
      const j: Job = { id: uid(), companyId, title, url, source, status, dateAdded };
      setDB((db) => { db.jobs.unshift(j); });
      logActivity(`Saved job "${title}"`, "job", j.id);
      toast.success("Job added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit job" : "Add job"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Job Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Job URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn / Naukri / Referral" /></div>
            <div><Label>Date added</Label><Input type="date" value={dateAdded} onChange={(e) => setDateAdded(e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
