import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, Briefcase, Users, Send, Handshake, ClipboardCheck, CalendarClock, Trophy, BellRing,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JobHunt CRM" },
      { name: "description", content: "Overview of your job search: companies, jobs, referrals, applications and follow-ups." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-3xl font-semibold mt-2">{value}</div>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent ?? "bg-primary/15 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const db = useDB((d) => d);
  const today = new Date().toISOString().slice(0, 10);

  const totalCompanies = db.companies.length;
  const totalJobs = db.jobs.length;
  const employeesContacted = db.employees.filter((e) => e.referralStatus !== "Not Contacted").length;
  const referralRequests = db.employees.filter((e) =>
    ["Message Sent", "Follow-up Sent", "Replied", "Referral Given", "No Response"].includes(e.referralStatus),
  ).length;
  const referralsReceived = db.employees.filter((e) => e.referralStatus === "Referral Given").length;
  const submitted = db.applications.filter((a) => a.status !== "Saved").length;
  const interviews = db.applications.filter((a) =>
    ["Interview Round 1", "Interview Round 2", "HR Round"].includes(a.status),
  ).length;
  const offers = db.applications.filter((a) => a.status === "Offer").length;

  const followupsDue = db.followups.filter((f) => f.nextFollowupDate <= today && f.status !== "Done");

  const recentActivities = db.activities.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your job search at a glance."
        actions={
          followupsDue.length > 0 ? (
            <Link
              to="/followups"
              className="inline-flex items-center gap-2 rounded-md bg-warning/15 text-warning border border-warning/30 px-3 py-1.5 text-sm"
            >
              <BellRing className="h-4 w-4" />
              {followupsDue.length} follow-up{followupsDue.length > 1 ? "s" : ""} due today
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <Stat icon={Building2} label="Total Companies" value={totalCompanies} />
        <Stat icon={Briefcase} label="Jobs Saved" value={totalJobs} />
        <Stat icon={Users} label="Employees Contacted" value={employeesContacted} />
        <Stat icon={Send} label="Referral Requests Sent" value={referralRequests} accent="bg-info/15 text-info" />
        <Stat icon={Handshake} label="Referrals Received" value={referralsReceived} accent="bg-success/15 text-success" />
        <Stat icon={ClipboardCheck} label="Applications Submitted" value={submitted} />
        <Stat icon={CalendarClock} label="Interviews Scheduled" value={interviews} accent="bg-warning/15 text-warning" />
        <Stat icon={Trophy} label="Offers Received" value={offers} accent="bg-success/15 text-success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentActivities.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground">{a.text}</div>
                      <div className="text-xs text-muted-foreground">{new Date(a.date).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link to="/activities" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["Saved","Applied","Assessment","Interview Round 1","Interview Round 2","HR Round","Offer","Rejected"].map((s) => {
              const count = db.applications.filter((a) => a.status === s).length;
              return (
                <div key={s} className="flex items-center justify-between text-sm">
                  <StatusBadge status={s} />
                  <span className="font-mono text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
