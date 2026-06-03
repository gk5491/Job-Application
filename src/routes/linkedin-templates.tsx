import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { logActivity, setDB, uid, useDB, type LinkedInTemplate } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { Plus, Pencil, Trash2, Files } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/linkedin-templates")({
  head: () => ({ meta: [{ title: "LinkedIn Templates — JobHunt CRM" }] }),
  component: LinkedInPage,
});

function LinkedInPage() {
  const templates = useDB((d) => d.linkedinTemplates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LinkedInTemplate | null>(null);

  const remove = (id: string) => {
    if (!confirm("Delete template?")) return;
    setDB((db) => { db.linkedinTemplates = db.linkedinTemplates.filter((t) => t.id !== id); });
    toast.success("Deleted");
  };
  const duplicate = (t: LinkedInTemplate) => {
    setDB((db) => { db.linkedinTemplates.unshift({ ...t, id: uid(), name: t.name + " (copy)" }); });
    toast.success("Duplicated");
  };

  return (
    <>
      <PageHeader
        title="LinkedIn Message Templates"
        description="Save & copy outreach messages with one click."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> New Template</Button>}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold">{t.name}</div>
              <div className="flex gap-1">
                <CopyButton value={t.message} label="Copy" />
                <Button size="icon" variant="ghost" onClick={() => duplicate(t)} title="Duplicate"><Files className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/40 rounded p-3 font-sans">{t.message}</pre>
          </Card>
        ))}
        {templates.length === 0 && <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center col-span-full">No templates yet.</div>}
      </div>

      <LDialog open={open} onOpenChange={setOpen} editing={editing} />
    </>
  );
}

function LDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: LinkedInTemplate | null }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { setName(editing?.name ?? ""); setMessage(editing?.message ?? ""); }, [editing, open]);

  const submit = () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (editing) {
      setDB((db) => {
        const i = db.linkedinTemplates.findIndex((t) => t.id === editing.id);
        if (i >= 0) db.linkedinTemplates[i] = { ...db.linkedinTemplates[i], name, message };
      });
      toast.success("Saved");
    } else {
      const t = { id: uid(), name, message };
      setDB((db) => { db.linkedinTemplates.unshift(t); });
      logActivity(`Added LinkedIn template "${name}"`, "template");
      toast.success("Added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Template name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi {name}, ..." /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
