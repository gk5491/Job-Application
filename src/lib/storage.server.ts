import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(section: string) {
  return join(DATA_DIR, `${section}.json`);
}

export function readSection<T>(section: string, fallback: T): T {
  ensureDir();
  const p = filePath(section);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeSection(section: string, data: unknown): void {
  ensureDir();
  writeFileSync(filePath(section), JSON.stringify(data, null, 2), "utf-8");
}

function makeSeed() {
  const now = new Date().toISOString();
  const c1id = uid();
  const c2id = uid();
  const e1id = uid();
  return {
    companies: [
      { id: c1id, name: "Amazon", website: "https://amazon.jobs", location: "Bangalore", notes: "Target company", createdAt: now },
      { id: c2id, name: "Google", website: "https://careers.google.com", location: "Hyderabad", notes: "", createdAt: now },
    ],
    jobs: [
      { id: uid(), companyId: c1id, title: "SDE I", url: "https://amazon.jobs/sde1", source: "LinkedIn", dateAdded: now.slice(0, 10), status: "Applied" },
    ],
    employees: [
      {
        id: e1id, name: "Rahul Sharma", companyId: c1id, designation: "SDE II",
        linkedinUrl: "https://linkedin.com/in/rahul",
        emails: ["rahul@amazon.com"], email: "rahul@amazon.com",
        contactDate: now.slice(0, 10), method: "LinkedIn", referralStatus: "Referral Given",
        notes: "Gave referral on 14 June",
        emailSubject: "Referral request for SDE I at Amazon",
        emailDraft: "Hi Rahul,\n\nI hope you're doing well. I noticed an opening for SDE I at Amazon. Based on my background, I believe I'd be a strong fit.\n\nWould you be open to referring me?\n\nThanks,\nYour Name",
        linkedinDraft: "Hi Rahul, I came across an SDE opening at Amazon. I have X years of experience and would love a referral. Could I share my resume?",
      },
    ],
    applications: [
      { id: uid(), companyId: c1id, jobTitle: "SDE I", applicationDate: now.slice(0, 10), email: "hr@amazon.com", applyLink: "https://amazon.jobs/sde1", status: "Assessment", notes: "Referred by Rahul" },
    ],
    linkedinTemplates: [
      { id: uid(), name: "Referral Request", message: "Hi {name}, I came across an SDE opening at {company}. I have X years of experience and would love a referral. Could I share my resume?" },
      { id: uid(), name: "Follow-up", message: "Hi {name}, just following up on my previous message about the {role} role at {company}. Appreciate any guidance!" },
    ],
    emailTemplates: [
      { id: uid(), name: "Cold Email - Referral", subject: "Referral request for {role} at {company}", body: "Hi {name},\n\nI hope you're doing well. I noticed an opening for {role} at {company}. Based on my background, I believe I'd be a strong fit.\n\nWould you be open to referring me?\n\nThanks,\nYour Name" },
    ],
    followups: [],
    activities: [
      { id: uid(), date: now, type: "general", text: "Welcome to your Job Hunt CRM" },
    ],
    sentMessages: [],
    resumes: [],
  };
}

const SECTIONS = [
  "companies", "jobs", "employees", "applications",
  "linkedinTemplates", "emailTemplates", "followups",
  "activities", "sentMessages", "resumes",
] as const;

export function readAllSections() {
  ensureDir();
  if (!existsSync(filePath("companies"))) {
    const seed = makeSeed();
    for (const [section, data] of Object.entries(seed)) {
      writeSection(section, data);
    }
    return seed;
  }
  const result: Record<string, unknown[]> = {};
  for (const section of SECTIONS) {
    result[section] = readSection(section, []);
  }
  return result as ReturnType<typeof makeSeed>;
}

export function writeAllSections(data: Record<string, unknown>) {
  ensureDir();
  for (const [section, items] of Object.entries(data)) {
    writeSection(section, items);
  }
}
