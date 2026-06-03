import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMemo, useState } from "react";
import { logActivity, setDB, uid, useDB, type Company } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Companies — JobHunt CRM" }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const companies = useDB((d) => d.companies);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const filtered = useMemo(
    () => companies.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.location ?? "").toLowerCase().includes(q.toLowerCase())),
    [companies, q],
  );

  const remove = (id: string) => {
    if (!confirm("Delete this company? Related jobs/employees keep their reference.")) return;
    setDB((db) => { db.companies = db.companies.filter((c) => c.id !== id); });
    logActivity("Deleted a company");
    toast.success("Company deleted");
  };

  return (
    <>
      <PageHeader
        title="Companies"
        description="Companies you're targeting."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Company
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or location..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                {c.location && <div className="text-xs text-muted-foreground">{c.location}</div>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            {c.website && (
              <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                <ExternalLink className="h-3 w-3" /> {c.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {c.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{c.notes}</p>}
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">
            No companies yet. Add your first one.
          </div>
        )}
      </div>

      <CompanyDialog open={open} onOpenChange={setOpen} editing={editing} />
    </>
  );
}

function CompanyDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Company | null }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setName(editing?.name ?? "");
    setWebsite(editing?.website ?? "");
    setLocation(editing?.location ?? "");
    setNotes(editing?.notes ?? "");
  }, [editing, open]);

  const submit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (editing) {
      setDB((db) => {
        const i = db.companies.findIndex((c) => c.id === editing.id);
        if (i >= 0) db.companies[i] = { ...db.companies[i], name, website, location, notes };
      });
      logActivity(`Updated company "${name}"`, "company", editing.id);
      toast.success("Company updated");
    } else {
      const c: Company = { id: uid(), name, website, location, notes, createdAt: new Date().toISOString() };
      setDB((db) => { db.companies.unshift(c); });
      logActivity(`Added company "${name}"`, "company", c.id);
      toast.success("Company added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit company" : "Add company"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Amazon" /></div>
          <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://amazon.jobs" /></div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore" /></div>
          <div><Label>Notes</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
