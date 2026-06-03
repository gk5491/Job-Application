import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { logActivity, setDB, uid, useDB, type EmailTemplate } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { Plus, Pencil, Trash2, Files, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/email-templates")({
  head: () => ({ meta: [{ title: "Email Templates — JobHunt CRM" }] }),
  component: EmailsPage,
});

function EmailsPage() {
  const templates = useDB((d) => d.emailTemplates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const remove = (id: string) => {
    if (!confirm("Delete template?")) return;
    setDB((db) => { db.emailTemplates = db.emailTemplates.filter((t) => t.id !== id); });
    toast.success("Deleted");
  };
  const duplicate = (t: EmailTemplate) => {
    setDB((db) => { db.emailTemplates.unshift({ ...t, id: uid(), name: t.name + " (copy)" }); });
    toast.success("Duplicated");
  };

  const mailto = (t: EmailTemplate) =>
    `mailto:?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`;

  return (
    <>
      <PageHeader
        title="Email Templates"
        description="Reusable cold-email templates with one-click copy."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> New Template</Button>}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Subject: {t.subject}</div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                <CopyButton value={`Subject: ${t.subject}\n\n${t.body}`} label="Copy" />
                <Button size="sm" variant="outline" asChild><a href={mailto(t)}><Mail className="h-3.5 w-3.5 mr-1" /> Open</a></Button>
                <Button size="icon" variant="ghost" onClick={() => duplicate(t)}><Files className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/40 rounded p-3 font-sans mt-2">{t.body}</pre>
          </Card>
        ))}
        {templates.length === 0 && <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center col-span-full">No templates yet.</div>}
      </div>

      <EDialog open={open} onOpenChange={setOpen} editing={editing} />
    </>
  );
}

function EDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: EmailTemplate | null }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setName(editing?.name ?? ""); setSubject(editing?.subject ?? ""); setBody(editing?.body ?? "");
  }, [editing, open]);

  const submit = () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (editing) {
      setDB((db) => {
        const i = db.emailTemplates.findIndex((t) => t.id === editing.id);
        if (i >= 0) db.emailTemplates[i] = { ...db.emailTemplates[i], name, subject, body };
      });
      toast.success("Saved");
    } else {
      const t = { id: uid(), name, subject, body };
      setDB((db) => { db.emailTemplates.unshift(t); });
      logActivity(`Added email template "${name}"`, "template");
      toast.success("Added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Template name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea rows={9} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
