import { useSyncExternalStore } from "react";
import { writeSectionFn, writeAllDataFn } from "./db.server";

export type ID = string;

export interface Company {
  id: ID;
  name: string;
  website?: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Assessment"
  | "Interview Round 1"
  | "Interview Round 2"
  | "HR Round"
  | "Offer"
  | "Rejected";

export const APP_STATUSES: ApplicationStatus[] = [
  "Saved", "Applied", "Assessment",
  "Interview Round 1", "Interview Round 2",
  "HR Round", "Offer", "Rejected",
];

export type JobStatus = "Saved" | "Applied" | "Interview" | "Rejected" | "Offer";
export const JOB_STATUSES: JobStatus[] = ["Saved", "Applied", "Interview", "Rejected", "Offer"];

export interface Job {
  id: ID;
  companyId: ID;
  title: string;
  url: string;
  source?: string;
  dateAdded: string;
  status: JobStatus;
}

export type CommunicationMethod = "LinkedIn" | "Email";
export type ReferralStatus =
  | "Not Contacted"
  | "Message Sent"
  | "Follow-up Sent"
  | "Replied"
  | "Referral Given"
  | "No Response";

export const REFERRAL_STATUSES: ReferralStatus[] = [
  "Not Contacted", "Message Sent", "Follow-up Sent",
  "Replied", "Referral Given", "No Response",
];

export interface Employee {
  id: ID;
  name: string;
  companyId: ID;
  designation?: string;
  linkedinUrl?: string;
  email?: string;
  emails?: string[];
  contactDate?: string;
  method?: CommunicationMethod;
  referralStatus: ReferralStatus;
  notes?: string;
  emailSubject?: string;
  emailDraft?: string;
  linkedinDraft?: string;
}

export interface Application {
  id: ID;
  companyId: ID;
  jobTitle: string;
  applicationDate: string;
  email?: string;
  applyLink?: string;
  status: ApplicationStatus;
  notes?: string;
}

export interface LinkedInTemplate {
  id: ID;
  name: string;
  message: string;
}

export interface EmailTemplate {
  id: ID;
  name: string;
  subject: string;
  body: string;
}

export interface Followup {
  id: ID;
  employeeId: ID;
  companyId: ID;
  lastContactDate: string;
  nextFollowupDate: string;
  status: string;
}

export interface SentMessage {
  id: ID;
  employeeId: ID;
  type: "email" | "linkedin";
  to: string[];
  subject?: string;
  body: string;
  date: string;
  employeeName?: string;
  resumeName?: string;
}

export interface StoredResume {
  id: ID;
  name: string;
  data: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Activity {
  id: ID;
  date: string;
  text: string;
  type: "company" | "employee" | "job" | "application" | "followup" | "template" | "general";
  refId?: ID;
  companyId?: ID;
}

export interface DBShape {
  companies: Company[];
  jobs: Job[];
  employees: Employee[];
  applications: Application[];
  linkedinTemplates: LinkedInTemplate[];
  emailTemplates: EmailTemplate[];
  followups: Followup[];
  activities: Activity[];
  sentMessages: SentMessage[];
  resumes: StoredResume[];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Sections that are written on every setDB call (small, fast)
const AUTO_SAVE_SECTIONS: (keyof DBShape)[] = [
  "companies", "jobs", "employees", "applications",
  "linkedinTemplates", "emailTemplates", "followups",
  "activities", "sentMessages",
];

let cache: DBShape | null = null;
let initialized = false;
const listeners = new Set<() => void>();
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

function emptyDB(): DBShape {
  return {
    companies: [], jobs: [], employees: [], applications: [],
    linkedinTemplates: [], emailTemplates: [], followups: [],
    activities: [], sentMessages: [], resumes: [],
  };
}

function notify() {
  listeners.forEach((l) => l());
}

/** Called once from root loader data — sets cache without triggering re-renders */
export function initDB(data: DBShape) {
  if (initialized) return;
  initialized = true;
  cache = {
    companies: data.companies ?? [],
    jobs: data.jobs ?? [],
    employees: data.employees ?? [],
    applications: data.applications ?? [],
    linkedinTemplates: data.linkedinTemplates ?? [],
    emailTemplates: data.emailTemplates ?? [],
    followups: data.followups ?? [],
    activities: data.activities ?? [],
    sentMessages: data.sentMessages ?? [],
    resumes: data.resumes ?? [],
  };
}

function load(): DBShape {
  return cache ?? emptyDB();
}

/** Debounced background write of one section to the server */
function scheduleSave(sections: (keyof DBShape)[]) {
  if (typeof window === "undefined") return;
  for (const section of sections) {
    const existing = pendingWrites.get(section);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      pendingWrites.delete(section);
      if (!cache) return;
      const items = cache[section as keyof DBShape];
      try {
        await writeSectionFn({ data: { section, items } });
      } catch (err) {
        console.error(`[DB] save failed for ${section}:`, err);
      }
    }, 250);
    pendingWrites.set(section, timer);
  }
}

export function getDB(): DBShape {
  return load();
}

/**
 * Update the DB. Pass explicit `sections` to scope the save.
 * If omitted, all non-resume sections are saved (resumes are excluded by default
 * to avoid serializing large base64 blobs on every unrelated update).
 */
export function setDB(
  updater: (db: DBShape) => DBShape | void,
  sections?: (keyof DBShape)[],
): void {
  const current = load();
  // Shallow-copy every array so useSyncExternalStore detects reference changes
  // and triggers reactive re-renders when any section is mutated in-place.
  const db: DBShape = {
    companies: [...current.companies],
    jobs: [...current.jobs],
    employees: [...current.employees],
    applications: [...current.applications],
    linkedinTemplates: [...current.linkedinTemplates],
    emailTemplates: [...current.emailTemplates],
    followups: [...current.followups],
    activities: [...current.activities],
    sentMessages: [...current.sentMessages],
    resumes: [...current.resumes],
  };
  const next = updater(db);
  cache = (next as DBShape) ?? db;
  notify();
  scheduleSave(sections ?? AUTO_SAVE_SECTIONS);
}

export function logActivity(
  text: string,
  type: Activity["type"] = "general",
  refId?: ID,
  companyId?: ID,
) {
  setDB((db) => {
    db.activities.unshift({ id: uid(), date: new Date().toISOString(), text, type, refId, companyId });
    if (db.activities.length > 500) db.activities.length = 500;
  }, ["activities"]);
}

export function saveSentMessage(msg: Omit<SentMessage, "id">) {
  setDB((db) => {
    db.sentMessages.unshift({ ...msg, id: uid() });
    if (db.sentMessages.length > 1000) db.sentMessages.length = 1000;
  }, ["sentMessages"]);
}

export function resetDB() {
  initialized = false;
  cache = null;
  pendingWrites.forEach((t) => clearTimeout(t));
  pendingWrites.clear();
  // Reload from server (which will re-seed if files are empty)
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export function exportDB(): string {
  return JSON.stringify(load(), null, 2);
}

export function importDB(json: string) {
  const data = JSON.parse(json) as DBShape;
  cache = {
    companies: data.companies ?? [],
    jobs: data.jobs ?? [],
    employees: data.employees ?? [],
    applications: data.applications ?? [],
    linkedinTemplates: data.linkedinTemplates ?? [],
    emailTemplates: data.emailTemplates ?? [],
    followups: data.followups ?? [],
    activities: data.activities ?? [],
    sentMessages: data.sentMessages ?? [],
    resumes: data.resumes ?? [],
  };
  notify();
  // Write all sections including resumes
  if (typeof window !== "undefined") {
    writeAllDataFn({ data: cache as unknown as Record<string, unknown> }).catch((err) => {
      console.error("[DB] import write failed:", err);
    });
  }
}

export function useDB<T>(selector: (db: DBShape) => T): T {
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const getSnapshot = () => selector(load());
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function companyName(db: DBShape, id: ID): string {
  return db.companies.find((c) => c.id === id)?.name ?? "Unknown";
}

export function employeeName(db: DBShape, id: ID): string {
  return db.employees.find((e) => e.id === id)?.name ?? "Unknown";
}

export function getEmployeeEmails(emp: Employee): string[] {
  if (emp.emails && emp.emails.length > 0) return emp.emails;
  if (emp.email) return [emp.email];
  return [];
}
