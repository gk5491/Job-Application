import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  logActivity, setDB, uid, useDB, APP_STATUSES, type Application, type ApplicationStatus, companyName,
} from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "Applications — JobHunt CRM" }] }),
  component: AppsPage,
});

function AppsPage() {
  const db = useDB((d) => d);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const filtered = useMemo(
    () => db.applications.filter((a) => companyFilter === "all" || a.companyId === companyFilter),
    [db.applications, companyFilter],
  );

  const remove = (id: string) => {
    if (!confirm("Delete this application?")) return;
    setDB((db) => { db.applications = db.applications.filter((a) => a.id !== id); });
    toast.success("Deleted");
  };

  const updateStatus = (id: string, status: ApplicationStatus) => {
    setDB((db) => {
      const i = db.applications.findIndex((a) => a.id === id);
      if (i >= 0) {
        const a = db.applications[i];
        a.status = status;
        db.activities.unshift({
          id: uid(), date: new Date().toISOString(), type: "application", refId: id,
          text: `${a.jobTitle} @ ${companyName(db, a.companyId)} → ${status}`,
        });
      }
    });
    toast.success(`Moved to ${status}`);
  };

  return (
    <>
      <PageHeader
        title="Application Tracker"
        description="Track every application end-to-end."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> Add Application</Button>}
      />

      <div className="flex items-center gap-2 mb-4">
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filter by company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {db.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Apply Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{companyName(db, a.companyId)}</TableCell>
                    <TableCell>{a.jobTitle}</TableCell>
                    <TableCell className="text-muted-foreground">{a.applicationDate}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.email || "—"}</TableCell>
                    <TableCell>
                      {a.applyLink ? (
                        <a href={a.applyLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                          <ExternalLink className="h-3 w-3" /> Open
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v as ApplicationStatus)}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{APP_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No applications yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-3">
            {APP_STATUSES.map((s) => {
              const items = filtered.filter((a) => a.status === s);
              return (
                <div key={s} className="w-72 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <StatusBadge status={s} />
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div
                    className="space-y-2 min-h-[100px] rounded-lg border border-dashed border-border p-2 bg-muted/30"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/plain");
                      if (id) updateStatus(id, s);
                    }}
                  >
                    {items.map((a) => (
                      <Card
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                        className="p-3 cursor-grab active:cursor-grabbing"
                      >
                        <div className="font-medium text-sm">{a.jobTitle}</div>
                        <div className="text-xs text-muted-foreground">{companyName(db, a.companyId)}</div>
                        {a.applyLink && (
                          <a href={a.applyLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-[10px] mt-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-2.5 w-2.5" /> Apply Link
                          </a>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">{a.applicationDate}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <AppDialog open={open} onOpenChange={setOpen} editing={editing} />
    </>
  );
}

function AppDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Application | null }) {
  const companies = useDB((d) => d.companies);
  const [form, setForm] = useState<Application>({
    id: "", companyId: "", jobTitle: "", applicationDate: "", status: "Saved",
  });

  useEffect(() => {
    setForm(editing ?? {
      id: "", companyId: companies[0]?.id ?? "", jobTitle: "",
      applicationDate: new Date().toISOString().slice(0, 10),
      email: "", applyLink: "", status: "Applied", notes: "",
    });
  }, [editing, open, companies]);

  const upd = <K extends keyof Application>(k: K, v: Application[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.companyId || !form.jobTitle) { toast.error("Company & title required"); return; }
    if (editing) {
      setDB((db) => {
        const i = db.applications.findIndex((a) => a.id === editing.id);
        if (i >= 0) db.applications[i] = { ...form, id: editing.id };
      });
      toast.success("Updated");
    } else {
      const a = { ...form, id: uid() };
      setDB((db) => { db.applications.unshift(a); });
      logActivity(`Application added: ${a.jobTitle}`, "application", a.id);
      toast.success("Added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit application" : "Add application"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company *</Label>
            <Select value={form.companyId} onValueChange={(v) => upd("companyId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Job Title *</Label><Input value={form.jobTitle} onChange={(e) => upd("jobTitle", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.applicationDate} onChange={(e) => upd("applicationDate", e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => upd("status", v as ApplicationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APP_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>HR / Recruiter Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => upd("email", e.target.value)} placeholder="hr@company.com" /></div>
          <div><Label>Apply Link</Label><Input type="url" value={form.applyLink ?? ""} onChange={(e) => upd("applyLink", e.target.value)} placeholder="https://..." /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
