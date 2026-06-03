import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  logActivity, saveSentMessage, setDB, uid, useDB, REFERRAL_STATUSES,
  type Employee, type ReferralStatus, type CommunicationMethod, companyName,
  type EmailTemplate, type LinkedInTemplate, type SentMessage, getEmployeeEmails,
  type StoredResume,
} from "@/lib/db";
import { sendEmailFn } from "@/lib/sendEmail.server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Plus, ExternalLink, Mail, Pencil, Trash2, Search, Send, X, Clock, ChevronRight, Paperclip } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — JobHunt CRM" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const db = useDB((d) => d);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [detail, setDetail] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    return db.employees.filter((e) => {
      if (statusFilter !== "all" && e.referralStatus !== statusFilter) return false;
      if (companyFilter !== "all" && e.companyId !== companyFilter) return false;
      const emails = getEmployeeEmails(e).join(" ");
      if (q && !`${e.name} ${emails} ${e.linkedinUrl ?? ""} ${companyName(db, e.companyId)}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [db, q, statusFilter, companyFilter]);

  const remove = (id: string) => {
    if (!confirm("Delete this employee?")) return;
    setDB((db) => { db.employees = db.employees.filter((e) => e.id !== id); });
    toast.success("Deleted");
  };

  const currentDetail = detail ? db.employees.find((e) => e.id === detail.id) ?? null : null;

  return (
    <>
      <PageHeader
        title="Employee / Referral Tracker"
        description="People you've contacted for referrals."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> Add Employee</Button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, LinkedIn, company..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {db.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All referral status</SelectItem>
            {REFERRAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => {
          const emails = getEmployeeEmails(e);
          const sentCount = db.sentMessages.filter((m) => m.employeeId === e.id).length;
          return (
            <Card
              key={e.id}
              className="p-4 cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
              onClick={() => setDetail(e)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.designation ? `${e.designation} · ` : ""}{companyName(db, e.companyId)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {sentCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs px-1.5" title={`${sentCount} sent messages`}>{sentCount}</span>
                  )}
                  <StatusBadge status={e.referralStatus} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3" onClick={(ev) => ev.stopPropagation()}>
                {e.linkedinUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={e.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> LinkedIn</a>
                  </Button>
                )}
                {emails.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setDetail(e)}>
                    <Mail className="h-3.5 w-3.5 mr-1" /> Email
                  </Button>
                )}
              </div>

              {e.notes && <p className="text-xs text-muted-foreground mt-3 whitespace-pre-wrap line-clamp-2">{e.notes}</p>}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border" onClick={(ev) => ev.stopPropagation()}>
                <div className="text-xs text-muted-foreground">
                  {e.contactDate ? `Contacted ${e.contactDate}` : "Not contacted yet"}
                  {e.method ? ` · ${e.method}` : ""}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setEditing(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">
            No employees match.
          </div>
        )}
      </div>

      <EmployeeDialog open={open} onOpenChange={setOpen} editing={editing} />
      {currentDetail && (
        <EmployeeDetailDialog
          employee={currentDetail}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(currentDetail); setDetail(null); setOpen(true); }}
        />
      )}
    </>
  );
}

function EmployeeDetailDialog({ employee, onClose, onEdit }: {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
}) {
  const db = useDB((d) => d);
  const [emailSubject, setEmailSubject] = useState(employee.emailSubject ?? "");
  const [emailDraft, setEmailDraft] = useState(employee.emailDraft ?? "");
  const [linkedinDraft, setLinkedinDraft] = useState(employee.linkedinDraft ?? "");
  const [sending, setSending] = useState(false);
  const [viewMsg, setViewMsg] = useState<SentMessage | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("none");

  const sentMessages = db.sentMessages.filter((m) => m.employeeId === employee.id);
  const emails = getEmployeeEmails(employee);
  const selectedResume: StoredResume | undefined = db.resumes.find((r) => r.id === selectedResumeId);

  useEffect(() => {
    setEmailSubject(employee.emailSubject ?? "");
    setEmailDraft(employee.emailDraft ?? "");
    setLinkedinDraft(employee.linkedinDraft ?? "");
  }, [employee.id, employee.emailSubject, employee.emailDraft, employee.linkedinDraft]);

  const saveDrafts = () => {
    setDB((db) => {
      const i = db.employees.findIndex((e) => e.id === employee.id);
      if (i >= 0) {
        db.employees[i] = { ...db.employees[i], emailSubject, emailDraft, linkedinDraft };
      }
    });
  };

  const applyEmailTemplate = (t: EmailTemplate) => {
    const name = employee.name.split(" ")[0];
    const company = companyName(db, employee.companyId);
    setEmailSubject(t.subject.replace(/{name}/g, name).replace(/{company}/g, company).replace(/{role}/g, employee.designation ?? ""));
    setEmailDraft(t.body.replace(/{name}/g, name).replace(/{company}/g, company).replace(/{role}/g, employee.designation ?? ""));
  };

  const applyLinkedInTemplate = (t: LinkedInTemplate) => {
    const name = employee.name.split(" ")[0];
    const company = companyName(db, employee.companyId);
    setLinkedinDraft(t.message.replace(/{name}/g, name).replace(/{company}/g, company).replace(/{role}/g, employee.designation ?? ""));
  };

  const sendEmail = async () => {
    if (emails.length === 0) { toast.error("No email address set for this employee"); return; }
    setSending(true);
    saveDrafts();
    try {
      await sendEmailFn({
        data: {
          to: emails,
          subject: emailSubject,
          body: emailDraft,
          resumeData: selectedResume?.data,
          resumeName: selectedResume?.name,
          resumeMimeType: selectedResume?.mimeType,
        },
      });
      saveSentMessage({
        employeeId: employee.id,
        type: "email",
        to: emails,
        subject: emailSubject,
        body: emailDraft,
        date: new Date().toISOString(),
        employeeName: employee.name,
        resumeName: selectedResume?.name,
      });
      logActivity(`Email sent to ${employee.name}${selectedResume ? ` with ${selectedResume.name}` : ""}`, "employee", employee.id, employee.companyId);
      toast.success(`Email sent to ${emails.join(", ")}${selectedResume ? ` · Resume attached` : ""}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const copyLinkedIn = () => {
    navigator.clipboard.writeText(linkedinDraft).then(() => {
      saveDrafts();
      saveSentMessage({
        employeeId: employee.id,
        type: "linkedin",
        to: [],
        body: linkedinDraft,
        date: new Date().toISOString(),
        employeeName: employee.name,
      });
      logActivity(`LinkedIn message copied for ${employee.name}`, "employee", employee.id, employee.companyId);
      toast.success("LinkedIn message copied!");
    });
  };

  return (
    <>
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">{employee.name}</DialogTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {employee.designation ? `${employee.designation} · ` : ""}{companyName(db, employee.companyId)}
                </div>
              </div>
              <div className="flex items-center gap-2 mr-6">
                <StatusBadge status={employee.referralStatus} />
                <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
            {emails.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Email{emails.length > 1 ? "s" : ""}: </span>
                {emails.map((em, i) => (
                  <span key={i} className="font-mono text-xs mr-2">{em}</span>
                ))}
              </div>
            )}
            {employee.linkedinUrl && (
              <div className="col-span-2">
                <span className="text-muted-foreground">LinkedIn: </span>
                <a href={employee.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">{employee.linkedinUrl}</a>
              </div>
            )}
            {employee.contactDate && <div><span className="text-muted-foreground">Contacted: </span>{employee.contactDate}</div>}
            {employee.method && <div><span className="text-muted-foreground">Method: </span>{employee.method}</div>}
            {employee.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes: </span>{employee.notes}</div>}
          </div>

          <Tabs defaultValue="email">
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1"><Mail className="h-4 w-4 mr-1.5" /> Email</TabsTrigger>
              <TabsTrigger value="linkedin" className="flex-1"><ExternalLink className="h-4 w-4 mr-1.5" /> LinkedIn</TabsTrigger>
              <TabsTrigger value="sent" className="flex-1">
                <Clock className="h-4 w-4 mr-1.5" /> Sent
                {sentMessages.length > 0 && <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 text-primary text-xs px-1">{sentMessages.length}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-3 mt-4">
              {db.emailTemplates.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Load from template</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {db.emailTemplates.map((t) => (
                      <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => applyEmailTemplate(t)}>{t.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {emails.length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  <span className="font-medium">Sending to: </span>{emails.join(", ")}
                </div>
              )}
              <div>
                <Label>Subject</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject..." />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={6} value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="Write your email here..." />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-2"><Paperclip className="h-3.5 w-3.5" /> Attach Resume</Label>
                {db.resumes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No resumes uploaded yet. Go to <span className="font-medium">Settings → Resume Files</span> to upload.</p>
                ) : (
                  <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No resume attached" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No resume (send without attachment)</SelectItem>
                      {db.resumes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={sendEmail} disabled={sending || emails.length === 0}>
                  <Send className="h-4 w-4 mr-1.5" /> {sending ? "Sending..." : "Send Email"}
                </Button>
                <Button variant="outline" onClick={() => { saveDrafts(); toast.success("Draft saved"); }}>Save Draft</Button>
                {emails.length === 0 && <span className="text-xs text-muted-foreground self-center">No email address set</span>}
              </div>
            </TabsContent>

            <TabsContent value="linkedin" className="space-y-3 mt-4">
              {db.linkedinTemplates.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Load from template</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {db.linkedinTemplates.map((t) => (
                      <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => applyLinkedInTemplate(t)}>{t.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Message</Label>
                <Textarea rows={7} value={linkedinDraft} onChange={(e) => setLinkedinDraft(e.target.value)} placeholder="Write your LinkedIn message here..." />
              </div>
              <div className="flex gap-2">
                {employee.linkedinUrl && (
                  <Button variant="outline" asChild>
                    <a href={employee.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> Open LinkedIn</a>
                  </Button>
                )}
                <Button onClick={copyLinkedIn}><Send className="h-4 w-4 mr-1.5" /> Copy & Save</Button>
                <Button variant="outline" onClick={() => { saveDrafts(); toast.success("Draft saved"); }}>Save Draft</Button>
              </div>
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              {sentMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
                  No messages sent yet. Send an email or copy a LinkedIn message to see history here.
                </div>
              ) : (
                <div className="space-y-2">
                  {sentMessages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => setViewMsg(msg)}
                      className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${msg.type === "email" ? "bg-blue-500/15 text-blue-400" : "bg-cyan-500/15 text-cyan-400"}`}>
                          {msg.type === "email" ? <Mail className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {msg.type === "email" ? (msg.subject || "(no subject)") : "LinkedIn Message"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {msg.type === "email" ? `To: ${msg.to.join(", ")}` : "Copied to clipboard"}
                            {" · "}{new Date(msg.date).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {viewMsg && (
        <Dialog open onOpenChange={(v) => { if (!v) setViewMsg(null); }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewMsg.type === "email" ? <Mail className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                {viewMsg.type === "email" ? "Sent Email" : "Sent LinkedIn Message"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">{new Date(viewMsg.date).toLocaleString()}</div>
              {viewMsg.type === "email" && (
                <>
                  <div><span className="text-muted-foreground font-medium">To: </span>{viewMsg.to.join(", ")}</div>
                  <div><span className="text-muted-foreground font-medium">Subject: </span>{viewMsg.subject}</div>
                </>
              )}
              <div>
                <div className="text-muted-foreground font-medium mb-1">Message:</div>
                <pre className="whitespace-pre-wrap bg-muted/40 rounded p-3 text-sm font-sans">{viewMsg.body}</pre>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewMsg(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function MultiEmailInput({ emails, onChange }: { emails: string[]; onChange: (v: string[]) => void }) {
  const list = emails.length > 0 ? emails : [""];

  const update = (idx: number, val: string) => {
    const next = [...list];
    next[idx] = val;
    onChange(next.filter((e, i) => e.trim() !== "" || i === next.length - 1 || i === 0));
  };
  const remove = (idx: number) => onChange(list.filter((_, i) => i !== idx));
  const add = () => onChange([...list, ""]);

  return (
    <div className="space-y-2">
      {list.map((email, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={idx === 0 ? "Email address" : "Another email address"}
            className="flex-1"
          />
          {list.length > 1 && (
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(idx)} className="shrink-0">
              <X className="h-4 w-4 text-destructive" />
            </Button>
          )}
          {idx === list.length - 1 && (
            <Button type="button" size="icon" variant="outline" onClick={add} className="shrink-0" title="Add another email">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function EmployeeDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Employee | null }) {
  const db = useDB((d) => d);
  const [form, setForm] = useState<Employee>({
    id: "", name: "", companyId: "", referralStatus: "Not Contacted",
  });
  const [emailList, setEmailList] = useState<string[]>([""]);

  useEffect(() => {
    const emp = editing ?? {
      id: "", name: "", companyId: db.companies[0]?.id ?? "",
      designation: "", linkedinUrl: "",
      emails: [""],
      email: "",
      contactDate: new Date().toISOString().slice(0, 10),
      method: "LinkedIn" as CommunicationMethod,
      referralStatus: "Not Contacted" as ReferralStatus,
      notes: "",
      emailSubject: "", emailDraft: "", linkedinDraft: "",
    };
    setForm(emp);
    setEmailList(getEmployeeEmails(emp).length > 0 ? getEmployeeEmails(emp) : [""]);
  }, [editing, open, db.companies]);

  const upd = <K extends keyof Employee>(k: K, v: Employee[K]) => setForm((f) => ({ ...f, [k]: v }));

  const applyEmailTemplate = (t: EmailTemplate) => {
    const name = form.name.split(" ")[0] || "{name}";
    const company = companyName(db, form.companyId) || "{company}";
    upd("emailSubject", t.subject.replace(/{name}/g, name).replace(/{company}/g, company).replace(/{role}/g, form.designation ?? ""));
    upd("emailDraft", t.body.replace(/{name}/g, name).replace(/{company}/g, company).replace(/{role}/g, form.designation ?? ""));
  };

  const applyLinkedInTemplate = (t: LinkedInTemplate) => {
    const name = form.name.split(" ")[0] || "{name}";
    const company = companyName(db, form.companyId) || "{company}";
    upd("linkedinDraft", t.message.replace(/{name}/g, name).replace(/{company}/g, company).replace(/{role}/g, form.designation ?? ""));
  };

  const submit = () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (!form.companyId) { toast.error("Add a company first"); return; }
    const cleanEmails = emailList.filter((e) => e.trim() !== "");
    const finalForm = { ...form, emails: cleanEmails, email: cleanEmails[0] ?? "" };
    if (editing) {
      setDB((db) => {
        const i = db.employees.findIndex((e) => e.id === editing.id);
        if (i >= 0) db.employees[i] = { ...finalForm, id: editing.id };
      });
      toast.success("Updated");
    } else {
      const e = { ...finalForm, id: uid() };
      setDB((db) => { db.employees.unshift(e); });
      logActivity(`Added employee ${e.name}`, "employee", e.id, e.companyId);
      toast.success("Added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle></DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="email" className="flex-1"><Mail className="h-4 w-4 mr-1.5" /> Email</TabsTrigger>
            <TabsTrigger value="linkedin" className="flex-1"><ExternalLink className="h-4 w-4 mr-1.5" /> LinkedIn Msg</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => upd("name", e.target.value)} /></div>
              <div>
                <Label>Company *</Label>
                <Select value={form.companyId} onValueChange={(v) => upd("companyId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{db.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Designation</Label><Input value={form.designation ?? ""} onChange={(e) => upd("designation", e.target.value)} /></div>
            <div><Label>LinkedIn URL</Label><Input value={form.linkedinUrl ?? ""} onChange={(e) => upd("linkedinUrl", e.target.value)} /></div>
            <div>
              <Label className="mb-2 block">Email{emailList.filter(Boolean).length > 1 ? "s" : ""}</Label>
              <MultiEmailInput emails={emailList} onChange={setEmailList} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Contact Date</Label><Input type="date" value={form.contactDate ?? ""} onChange={(e) => upd("contactDate", e.target.value)} /></div>
              <div>
                <Label>Method</Label>
                <Select value={form.method ?? "LinkedIn"} onValueChange={(v) => upd("method", v as CommunicationMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LinkedIn">LinkedIn</SelectItem><SelectItem value="Email">Email</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referral Status</Label>
                <Select value={form.referralStatus} onValueChange={(v) => upd("referralStatus", v as ReferralStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REFERRAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} placeholder="e.g. Asked for referral on 10 June. Follow-up required after 5 days." /></div>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-4">
            {db.emailTemplates.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Load from template</Label>
                <div className="flex flex-wrap gap-1.5">
                  {db.emailTemplates.map((t) => (
                    <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => applyEmailTemplate(t)}>{t.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div><Label>Subject</Label><Input value={form.emailSubject ?? ""} onChange={(e) => upd("emailSubject", e.target.value)} placeholder="Email subject..." /></div>
            <div><Label>Message</Label><Textarea rows={9} value={form.emailDraft ?? ""} onChange={(e) => upd("emailDraft", e.target.value)} placeholder="Write your email message here..." /></div>
          </TabsContent>

          <TabsContent value="linkedin" className="space-y-3 mt-4">
            {db.linkedinTemplates.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Load from template</Label>
                <div className="flex flex-wrap gap-1.5">
                  {db.linkedinTemplates.map((t) => (
                    <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => applyLinkedInTemplate(t)}>{t.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div><Label>Message</Label><Textarea rows={9} value={form.linkedinDraft ?? ""} onChange={(e) => upd("linkedinDraft", e.target.value)} placeholder="Write your LinkedIn message here..." /></div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
