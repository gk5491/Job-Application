import { createFileRoute } from "@tanstack/react-router";
import { exportDB, importDB, setDB, uid, useDB, type StoredResume } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, FileText, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — JobHunt CRM" }] }),
  component: SettingsPage,
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SettingsPage() {
  const db = useDB((d) => d);
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const download = () => {
    const json = exportDB();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `jobhunt-crm-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const doImport = () => {
    try { importDB(text); toast.success("Imported"); setText(""); }
    catch { toast.error("Invalid JSON"); }
  };

  const handleResumeFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    let added = 0;
    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
        toast.error(`${file.name}: only PDF, DOC, DOCX files are supported`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: file must be under 5 MB`);
        continue;
      }
      try {
        const data = await readFileAsBase64(file);
        const resume: StoredResume = {
          id: uid(),
          name: file.name,
          data,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
        setDB((db) => { db.resumes.unshift(resume); }, ["resumes"]);
        added++;
      } catch {
        toast.error(`Failed to read ${file.name}`);
      }
    }
    if (added > 0) toast.success(`${added} resume${added > 1 ? "s" : ""} uploaded`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteResume = (id: string) => {
    if (!confirm("Delete this resume?")) return;
    setDB((db) => { db.resumes = db.resumes.filter((r) => r.id !== id); }, ["resumes"]);
    toast.success("Resume deleted");
  };

  const downloadResume = (resume: StoredResume) => {
    const blob = b64toBlob(resume.data, resume.mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = resume.name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your local JSON database." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Database</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All data is saved to JSON files on the server (<code className="text-xs bg-muted px-1 rounded">data/</code> folder). Export regularly to back up.
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>Companies: <span className="font-mono text-foreground">{db.companies.length}</span></div>
              <div>Jobs: <span className="font-mono text-foreground">{db.jobs.length}</span></div>
              <div>Employees: <span className="font-mono text-foreground">{db.employees.length}</span></div>
              <div>Applications: <span className="font-mono text-foreground">{db.applications.length}</span></div>
              <div>Follow-ups: <span className="font-mono text-foreground">{db.followups.length}</span></div>
              <div>Activities: <span className="font-mono text-foreground">{db.activities.length}</span></div>
            </div>
            <Button onClick={download}><Download className="h-4 w-4 mr-1.5" /> Export JSON</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Import JSON</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste exported JSON here..." />
            <Button onClick={doImport} disabled={!text}><Upload className="h-4 w-4 mr-1.5" /> Import</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resume Files</CardTitle>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Plus className="h-4 w-4 mr-1.5" /> {uploading ? "Uploading..." : "Upload Resume"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload your resumes (PDF, DOC, DOCX — max 5 MB each). You can attach them when sending emails.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => handleResumeFiles(e.target.files)}
            />
            {db.resumes.length === 0 ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload your resume files</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX • Max 5 MB each</p>
              </div>
            ) : (
              <div className="space-y-2">
                {db.resumes.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{formatBytes(r.size)} · Uploaded {new Date(r.uploadedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => downloadResume(r)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteResume(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-border rounded-lg py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  + Add another resume
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function b64toBlob(b64: string, mime: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
