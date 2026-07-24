import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Matter, Document, Task, TimeEntry, Invoice, ClientMessage, TimelineEvent, CalendarEvent, DepositionTranscript, PrivilegeLogEntry, CourtRuleDeadline } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// User Account Interface
interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  firmName: string;
  role: 'Managing Partner' | 'Senior Associate' | 'In-House Counsel' | 'Legal Executive' | 'Client Representative';
  barAssociationId: string;
  jurisdiction: string;
  accountType: 'Law Firm' | 'Solo Practitioner' | 'Corporate Counsel' | 'Client';
  subscriptionTier: 'Free Trial' | 'Solo Practice' | 'Pro Practice' | 'Enterprise & Arbitration';
  planStatus: 'Active' | 'Trial' | 'Expired';
  trialDaysLeft: number;
  seats: number;
  maxSeats: number;
  billingCycle: 'Monthly' | 'Annual';
  renewalDate: string;
  biometricEnabled: boolean;
}

// Global In-Memory and Persistent Database for Wakeely Pro
let userDatabase: Record<string, UserAccount> = {};
let activeSessions = new Map<string, string>(); // sessionToken -> userEmail

let matters: Matter[] = [
  {
    id: "m1",
    title: "Al-Tayer Logistics vs. Global Port Authority",
    description: "Multi-party commercial contract dispute regarding delayed shipments, localized custom clearances, and force majeure claims in Jebel Ali Free Zone (JAFZ). Requires Sharia contract compliance review.",
    jurisdiction: "Dubai Commercial Court (DIFC-compliant)",
    clientName: "Tariq Al-Tayer",
    clientEmail: "tariq@altayer-logistics.ae",
    opposingParty: "Global Port Authority",
    opposingCounsel: "Baker & McKenzie Middle East",
    judge: "Judge Abdulrahman Al-Mansoori",
    court: "Dubai Court of First Instance",
    statuteOfLimitations: "2027-02-15",
    riskLevel: "High",
    status: "Active",
    winProbability: 75,
    budget: 15000,
    expenses: 4200
  },
  {
    id: "m2",
    title: "Al-Ghanim Family Corporate Restructuring",
    description: "Complex reorganization of a multi-generational family estate and group holding company across Kuwait and UAE. Includes cross-border assets, trust setup, and liquidation analysis.",
    jurisdiction: "Kuwait Court of Cassation & DIFC Wills Registry",
    clientName: "Fatima Al-Ghanim",
    clientEmail: "fatima@alghanim-holding.kw",
    opposingParty: "Minority Shareholder Faction",
    opposingCounsel: "Al-Jouan Legal Chamber",
    judge: "Justice Tareq Al-Saeed",
    court: "Kuwait Corporate Tribunal",
    statuteOfLimitations: "2028-11-30",
    riskLevel: "Medium",
    status: "Active",
    winProbability: 90,
    budget: 35000,
    expenses: 12500
  },
  {
    id: "m3",
    title: "PetroRiyadh Solar Project Arbitration",
    description: "Arbitration proceedings for construction delays on a 150MW utility-scale solar project under FIDIC Silver Book conditions. High exposure claim involving supply chain disruptions.",
    jurisdiction: "Saudi Commercial Arbitration Center (SCCA), Riyadh",
    clientName: "Eng. Khalid bin Fahd",
    clientEmail: "k.fahd@petroriyadh.sa",
    opposingParty: "Helios Renewable Systems",
    opposingCounsel: "Clifford Chance (Riyadh Office)",
    judge: "Dr. S. Al-Suwailem (Arbitrator)",
    court: "SCCA Panel No. 4",
    statuteOfLimitations: "2026-12-01",
    riskLevel: "High",
    status: "Active",
    winProbability: 60,
    budget: 80000,
    expenses: 34000
  }
];

let documents: Document[] = [
  {
    id: "d1",
    matterId: "m1",
    name: "JAFZ_Logistics_Service_Agreement_2024.pdf",
    category: "Contract",
    version: 3,
    uploadedAt: "2026-06-12T10:30:00Z",
    uploadedBy: "Farah Al-Sabah (Senior Associate)",
    fileSize: "4.2 MB",
    visibleToClient: true,
    aiSummary: "Logistics SLA between Al-Tayer Logistics and GPA. Section 14.2 contains a disputed liquidated damages clause charging 15,000 JOD per day of delay, subject to force majeure caps.",
    aiTags: ["SLA", "Disputed Clause", "Liquidated Damages", "Force Majeure"]
  },
  {
    id: "d2",
    matterId: "m1",
    name: "Pleading_Statement_of_Claim_v1.docx",
    category: "Pleading",
    version: 1,
    uploadedAt: "2026-07-02T14:15:00Z",
    uploadedBy: "Farah Al-Sabah (Senior Associate)",
    fileSize: "1.8 MB",
    visibleToClient: false,
    aiSummary: "Draft Statement of Claim alleging GPA's breach of contract due to arbitrary port gate closures. Seeking 120,000 JOD in direct damages.",
    aiTags: ["Claim", "Pleading", "Port Gates", "Direct Damages"]
  },
  {
    id: "d3",
    matterId: "m2",
    name: "Al-Ghanim_Shareholder_Trust_Draft.pdf",
    category: "Corporate",
    version: 2,
    uploadedAt: "2026-07-10T09:00:00Z",
    uploadedBy: "Walid Al-Gharaballi (Partner)",
    fileSize: "8.5 MB",
    visibleToClient: true,
    aiSummary: "Proposed trust restructure separating commercial operations from real estate holding. Restructuring will secure asset distribution in line with family agreements and Kuwait commercial law.",
    aiTags: ["Trust", "Restructuring", "Estate Planning", "Family Protocol"]
  }
];

let tasks: Task[] = [
  {
    id: "t1",
    matterId: "m1",
    title: "Obtain Port Gate Logs from JAFZ Customs Authority",
    description: "Request official logs of port gate closures for July 3-7 to substantiate GPA closures claim.",
    assignedTo: "Farah Al-Sabah",
    dueDate: "2026-07-25",
    status: "In Progress",
    priority: "High",
    visibleToClient: true,
    dependsOnTaskIds: []
  },
  {
    id: "t2",
    matterId: "m1",
    title: "Draft Amended Statement of Claim",
    description: "Integrate GPA's force majeure defense and update damages calculation.",
    assignedTo: "Walid Al-Gharaballi",
    dueDate: "2026-07-28",
    status: "To Do",
    priority: "High",
    visibleToClient: false,
    dependsOnTaskIds: ["t1"]
  },
  {
    id: "t3",
    matterId: "m1",
    title: "Prepare Client Deposition Brief",
    description: "Brief Tariq Al-Tayer on cross-examination strategy for the upcoming court hearing.",
    assignedTo: "Farah Al-Sabah",
    dueDate: "2026-08-01",
    status: "Completed",
    priority: "Medium",
    visibleToClient: true,
    dependsOnTaskIds: ["t2"]
  },
  {
    id: "t4",
    matterId: "m2",
    title: "Review DIFC Wills Registry Compliance",
    description: "Ensure the draft trust protocol aligns perfectly with the non-Muslim wills registry rules.",
    assignedTo: "Farah Al-Sabah",
    dueDate: "2026-07-27",
    status: "Under Review",
    priority: "Medium",
    visibleToClient: false,
    dependsOnTaskIds: []
  }
];

let timeEntries: TimeEntry[] = [
  {
    id: "te1",
    matterId: "m1",
    description: "Review of SLA and gate logs",
    hours: 3.5,
    rate: 150,
    date: "2026-07-15",
    billed: true
  },
  {
    id: "te2",
    matterId: "m1",
    description: "Drafting responsive pleading notes and defense arguments",
    hours: 2.2,
    rate: 150,
    date: "2026-07-18",
    billed: false
  },
  {
    id: "te3",
    matterId: "m2",
    description: "Consultation call with Fatima Al-Ghanim regarding trusts",
    hours: 1.5,
    rate: 250,
    date: "2026-07-12",
    billed: true
  }
];

let invoices: Invoice[] = [
  {
    id: "inv1",
    matterId: "m1",
    invoiceNumber: "INV-2026-0081",
    issueDate: "2026-07-01",
    dueDate: "2026-07-20",
    totalAmount: 525,
    status: "Paid",
    paymentTxId: "TXN-9021-384"
  },
  {
    id: "inv2",
    matterId: "m1",
    invoiceNumber: "INV-2026-0094",
    issueDate: "2026-07-19",
    dueDate: "2026-08-05",
    totalAmount: 330,
    status: "Sent"
  },
  {
    id: "inv3",
    matterId: "m2",
    invoiceNumber: "INV-2026-0082",
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    totalAmount: 375,
    status: "Overdue"
  }
];

let clientMessages: ClientMessage[] = [
  {
    id: "msg1",
    matterId: "m1",
    sender: "Lawyer",
    text: "Dear Tariq, we have finalized the draft deposition brief. Let's schedule a Zoom session tomorrow at 11 AM to practice standard questions from the panel.",
    timestamp: "2026-07-18T09:12:00Z"
  },
  {
    id: "msg2",
    matterId: "m1",
    sender: "Client",
    text: "Excellent work Farah. I am free at 11 AM. Did we include the gate logs from JAFZ customs in the defense bundle?",
    timestamp: "2026-07-18T10:05:00Z"
  },
  {
    id: "msg3",
    matterId: "m1",
    sender: "Lawyer",
    text: "Yes, they are attached to Document 1. I've also set that document to 'Visible' in your portal for review.",
    timestamp: "2026-07-18T10:30:00Z"
  }
];

let timelineEvents: TimelineEvent[] = [
  {
    id: "tl1",
    matterId: "m1",
    title: "Statement of Claim Filed",
    description: "The initial claim statement filed electronically with the JAFZ commercial dispute tribunal.",
    date: "2026-06-10",
    visibleToClient: true,
    type: "filing"
  },
  {
    id: "tl2",
    matterId: "m1",
    title: "Mediation Meeting with Arbitrator",
    description: "Briefing session at Dubai Court of First Instance with Judge Al-Mansoori.",
    date: "2026-07-05",
    visibleToClient: true,
    type: "meeting"
  },
  {
    id: "tl3",
    matterId: "m1",
    title: "Deadline for Amended Defense Pleading",
    description: "Critical final date to file the response to opposing counsel's motion.",
    date: "2026-07-30",
    visibleToClient: false,
    type: "milestone"
  },
  {
    id: "tl4",
    matterId: "m1",
    title: "First Formal Hearing",
    description: "Dubai Commercial Court Oral Arguments.",
    date: "2026-08-15",
    visibleToClient: true,
    type: "hearing"
  }
];

let calendarEvents: CalendarEvent[] = [
  {
    id: "ce1",
    matterId: "m1",
    title: "Dubai Commercial Court First Hearing",
    description: "Oral arguments & pleading review with Judge Abdulrahman Al-Mansoori.",
    startDate: "2026-08-15",
    time: "10:00 AM",
    location: "Dubai Court of First Instance, Hall 4",
    category: "Hearing",
    syncedToGoogleCalendar: true
  },
  {
    id: "ce2",
    matterId: "m1",
    title: "Deadline: File Amended Defense Pleading",
    description: "Final submission date for amended pleading regarding JAFZ customs gate logs.",
    startDate: "2026-07-30",
    time: "02:00 PM",
    location: "Online E-Court Portal",
    category: "Court Deadline",
    syncedToGoogleCalendar: false
  },
  {
    id: "ce3",
    matterId: "m1",
    title: "Deposition Strategy Briefing with Tariq Al-Tayer",
    description: "Prep client on cross-examination questions.",
    startDate: "2026-07-26",
    time: "11:00 AM",
    location: "Wakeely Conference Room A / Zoom",
    category: "Client Meeting",
    syncedToGoogleCalendar: true
  },
  {
    id: "ce4",
    matterId: "m2",
    title: "SCCA Arbitration Preliminary Panel Hearing",
    description: "Initial procedural conference for PetroRiyadh arbitration.",
    startDate: "2026-08-05",
    time: "09:30 AM",
    location: "SCCA Riyadh Center / Hybrid",
    category: "Arbitration",
    syncedToGoogleCalendar: true
  }
];

let transcripts: DepositionTranscript[] = [
  {
    id: "dt1",
    matterId: "m1",
    witnessName: "Capt. Rashid Al-Nuaimi",
    witnessRole: "Chief Operations Officer, Global Port Authority",
    depositionDate: "2026-07-12",
    deponentParty: "Adverse Party",
    pagesCount: 3,
    uploadedAt: "2026-07-14T11:00:00Z",
    keyAdmissionsSummary: "Witness admitted GPA experienced unannounced gate maintenance on July 4, causing a 14-hour queue of Al-Tayer container trucks with no prior force majeure notice.",
    pages: [
      {
        pageNumber: 1,
        lineNumber: "10-24",
        timestamp: "09:30 AM",
        speaker: "Q (Farah Al-Sabah) / A (Capt. Rashid)",
        text: "Q: Captain Al-Nuaimi, state your full role at GPA during July 2026.\nA: I am the Chief Operating Officer overseeing all container logistics in Jebel Ali Zone 2.\nQ: Were you on duty when Gate 4 was closed on July 4th?\nA: Yes, I received the automated telemetry warning at 06:15 AM.",
        isKeyAdmission: false,
        tags: ["Role Confirmation", "Gate Telemetry"]
      },
      {
        pageNumber: 2,
        lineNumber: "02-18",
        timestamp: "09:50 AM",
        speaker: "Q (Farah Al-Sabah) / A (Capt. Rashid)",
        text: "Q: Did GPA issue a prior force majeure notification to Al-Tayer Logistics before shutting Gate 4?\nA: No written notice was sent prior to 2:00 PM that afternoon.\nQ: So for 8 hours, Al-Tayer's reefer trucks were detained without formal notice?\nA: Correct. We were attempting emergency hydraulic repairs.",
        isKeyAdmission: true,
        tags: ["Key Admission", "No Notice", "Force Majeure Contradiction"]
      },
      {
        pageNumber: 3,
        lineNumber: "05-22",
        timestamp: "10:15 AM",
        speaker: "Q (Farah Al-Sabah) / A (Capt. Rashid)",
        text: "Q: What was the total spoilage value logged in the port incident ledger?\nA: The internal report logged approximately 120,000 JOD in delayed perishable cargo impact.",
        isKeyAdmission: true,
        tags: ["Spoilage Damage", "Quantum of Loss"]
      }
    ]
  }
];

let privilegeLogEntries: PrivilegeLogEntry[] = [
  {
    id: "pl1",
    matterId: "m1",
    docControlNum: "PRIV-M1-001",
    docDate: "2026-06-20",
    author: "Farah Al-Sabah (Senior Associate)",
    recipients: "Tariq Al-Tayer (Client CEO), Walid Al-Gharaballi (Partner)",
    docType: "Legal Opinion Memo",
    subject: "Analysis of JAFZ Arbitral Precedents on Port Gate Closures and Force Majeure Defenses",
    privilegeClaimed: "Attorney-Client Privilege",
    justification: "Confidential legal advice rendered by counsel to client regarding litigation exposure and trial defense strategy.",
    isRedacted: true,
    reviewStatus: "Verified"
  },
  {
    id: "pl2",
    matterId: "m1",
    docControlNum: "PRIV-M1-002",
    docDate: "2026-07-01",
    author: "Walid Al-Gharaballi (Partner)",
    recipients: "Farah Al-Sabah (Senior Associate)",
    docType: "Work-Product Draft",
    subject: "Internal Trial Strategy Notes & Witness Cross-Examination Outline for Capt. Rashid",
    privilegeClaimed: "Work-Product Doctrine",
    justification: "Attorney mental impressions, trial strategy notes, and legal theories prepared in anticipation of commercial litigation.",
    isRedacted: true,
    reviewStatus: "Verified"
  }
];

let auditLogs: Array<{
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  matterId?: string;
  ipAddress?: string;
}> = [
  {
    id: "aud_01",
    timestamp: "2026-07-24T10:15:00Z",
    userId: "usr_lead_01",
    userName: "Adv. Tareq Al-Husseini",
    userRole: "Managing Partner",
    action: "ETHICS_WALL_CONFIGURED",
    details: "Established ethical information barrier on Matter m1 (Al-Tayer Logistics)",
    matterId: "m1",
    ipAddress: "192.168.1.100"
  }
];

// ================= FILE-BASED PERSISTENCE ENGINE =================
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabaseFromDisk() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const data = JSON.parse(content);
      if (data.users) userDatabase = data.users;
      if (data.sessions) {
        activeSessions = new Map(Object.entries(data.sessions));
      }
      if (data.auditLogs) auditLogs = data.auditLogs;
      if (data.matters) matters = data.matters;
      if (data.documents) documents = data.documents;
      if (data.tasks) tasks = data.tasks;
      if (data.timeEntries) timeEntries = data.timeEntries;
      if (data.invoices) invoices = data.invoices;
      if (data.clientMessages) clientMessages = data.clientMessages;
      if (data.timelineEvents) timelineEvents = data.timelineEvents;
      if (data.calendarEvents) calendarEvents = data.calendarEvents;
      if (data.transcripts) transcripts = data.transcripts;
      if (data.privilegeLogEntries) privilegeLogEntries = data.privilegeLogEntries;
      console.log("Successfully loaded persistent state from database.json");
    } catch (err) {
      console.error("Failed to parse database.json on startup:", err);
    }
  }
}

function saveDatabaseToDisk() {
  try {
    const sessionsObj: Record<string, string> = {};
    activeSessions.forEach((val, key) => {
      sessionsObj[key] = val;
    });

    const store = {
      users: userDatabase,
      sessions: sessionsObj,
      auditLogs,
      matters,
      documents,
      tasks,
      timeEntries,
      invoices,
      clientMessages,
      timelineEvents,
      calendarEvents,
      transcripts,
      privilegeLogEntries
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save persistent state to disk:", err);
  }
}

// Load state from disk immediately
loadDatabaseFromDisk();

// ================= AUTHENTICATION & AUTHORIZATION MIDDLEWARE =================
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  let token = req.cookies?.wakeely_session;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid authentication token" });
  }

  const email = activeSessions.get(token);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized: Session token invalid or expired" });
  }

  const user = userDatabase[email];
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User account not found" });
  }

  (req as any).user = user;
  (req as any).sessionToken = token;
  next();
}

function requireRole(...allowedRoles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user as UserAccount;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: Action requires role in [${allowedRoles.join(", ")}]. Current role: '${user.role}'` });
    }
    next();
  };
}

const ATTORNEY_ROLES = ['Managing Partner', 'Senior Associate', 'In-House Counsel', 'Legal Executive'];

async function syncToGoogleCalendarApi(event: CalendarEvent): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) {
    return { success: false, error: "Google OAuth access token not configured in workspace." };
  }

  try {
    const startIso = new Date(`${event.startDate}T${event.time ? '09:00:00' : '09:00:00'}`).toISOString();
    const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: `[Wakeely Legal] ${event.title}`,
        description: `${event.description}\n\nCategory: ${event.category}\nCase ID: ${event.matterId}`,
        location: event.location || undefined,
        start: { dateTime: startIso },
        end: { dateTime: endIso }
      })
    });

    if (response.ok) {
      const data = (await response.json()) as { id: string };
      return { success: true, googleEventId: data.id };
    } else {
      const errText = await response.text();
      console.warn("Google Calendar API return non-ok:", response.status, errText);
      return { success: false, error: `Google API Error (${response.status})` };
    }
  } catch (err: any) {
    console.error("Google Calendar API sync failed:", err);
    return { success: false, error: err.message };
  }
}

// ================= AUTHENTICATION ENDPOINTS =================
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, firmName, barAssociationId, jurisdiction, accountType } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (userDatabase[normalizedEmail]) {
    return res.status(400).json({ error: "An account with this email address already exists" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser: UserAccount = {
    id: `usr_${Date.now()}`,
    name: name || "Adv. Legal Counsel",
    email: normalizedEmail,
    passwordHash,
    firmName: firmName || "Premier Legal Chambers",
    role: req.body.role || "Senior Associate",
    barAssociationId: barAssociationId || "BAR-2026-REGISTERED",
    jurisdiction: jurisdiction || "Jordan & UAE Courts",
    accountType: accountType || "Law Firm",
    subscriptionTier: "Free Trial",
    planStatus: "Trial",
    trialDaysLeft: 14,
    seats: 1,
    maxSeats: 2,
    billingCycle: "Monthly",
    renewalDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    biometricEnabled: false
  };

  userDatabase[normalizedEmail] = newUser;
  const sessionToken = `wkl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  activeSessions.set(sessionToken, newUser.email);

  saveDatabaseToDisk();

  res.cookie("wakeely_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 86400000
  });

  const { passwordHash: _, ...userProfile } = newUser;
  res.status(201).json({
    token: sessionToken,
    user: userProfile
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = userDatabase[normalizedEmail];

  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password credentials" });
  }

  const sessionToken = `wkl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  activeSessions.set(sessionToken, user.email);

  saveDatabaseToDisk();

  res.cookie("wakeely_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 86400000
  });

  const { passwordHash: _, ...userProfile } = user;
  res.json({
    token: sessionToken,
    user: userProfile
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = (req as any).user as UserAccount;
  const { passwordHash: _, ...userProfile } = user;
  res.json({ user: userProfile });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const sessionToken = (req as any).sessionToken;
  if (sessionToken) {
    activeSessions.delete(sessionToken);
    saveDatabaseToDisk();
  }
  res.clearCookie("wakeely_session");
  res.json({ success: true });
});

app.post("/api/auth/subscription", requireAuth, (req, res) => {
  const user = (req as any).user as UserAccount;
  const { tier, billingCycle } = req.body;

  const maxSeats = tier === 'Enterprise & Arbitration' ? 99 : tier === 'Pro Practice' ? 10 : 1;
  user.subscriptionTier = tier || user.subscriptionTier;
  user.billingCycle = billingCycle || user.billingCycle;
  user.planStatus = 'Active';
  user.maxSeats = maxSeats;
  user.renewalDate = billingCycle === 'Annual' ? '2027-02-01' : '2026-03-01';

  saveDatabaseToDisk();

  const { passwordHash: _, ...userProfile } = user;
  res.json({ user: userProfile });
});

// ================= AUDIT LOGGING ENDPOINTS =================
app.get("/api/audit-logs", requireAuth, (req, res) => {
  res.json(auditLogs);
});

app.post("/api/audit-logs", requireAuth, (req, res) => {
  const user = (req as any).user as UserAccount;
  const { action, details, matterId } = req.body;

  const newLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: action || "PRIVILEGED_ACTION",
    details: details || "Action executed",
    matterId,
    ipAddress: req.ip || "127.0.0.1"
  };

  auditLogs.unshift(newLog);
  saveDatabaseToDisk();
  res.status(201).json(newLog);
});

// ================= PROTECTED CORE APPLICATION API ENDPOINTS =================

// Search endpoint for global search
app.get("/api/all-searchable-data", requireAuth, (req, res) => {
  res.json({
    matters,
    documents,
    tasks
  });
});

// Matters
app.get("/api/matters", requireAuth, (req, res) => {
  res.json(matters);
});

app.post("/api/matters", requireAuth, (req, res) => {
  const newMatter: Matter = {
    id: `m${Date.now()}`,
    title: req.body.title || "Untitled Matter",
    description: req.body.description || "",
    jurisdiction: req.body.jurisdiction || "Local GCC Court",
    clientName: req.body.clientName || "Unknown Client",
    clientEmail: req.body.clientEmail || "",
    opposingParty: req.body.opposingParty || "Unassigned",
    opposingCounsel: req.body.opposingCounsel || "Unassigned",
    judge: req.body.judge || "Pending Assignment",
    court: req.body.court || "Pending Assignment",
    statuteOfLimitations: req.body.statuteOfLimitations || "",
    riskLevel: req.body.riskLevel || "Low",
    status: "Active",
    winProbability: req.body.winProbability || 50,
    budget: req.body.budget || 5000,
    expenses: 0
  };
  matters.push(newMatter);
  saveDatabaseToDisk();
  res.status(201).json(newMatter);
});

app.put("/api/matters/:id", requireAuth, (req, res) => {
  const index = matters.findIndex(m => m.id === req.params.id);
  if (index !== -1) {
    matters[index] = { ...matters[index], ...req.body };
    saveDatabaseToDisk();
    res.json(matters[index]);
  } else {
    res.status(404).json({ error: "Matter not found" });
  }
});

// Documents
app.get("/api/matters/:matterId/documents", requireAuth, (req, res) => {
  res.json(documents.filter(d => d.matterId === req.params.matterId));
});

app.post("/api/documents", requireAuth, (req, res) => {
  const newDoc: Document = {
    id: `d${Date.now()}`,
    matterId: req.body.matterId,
    name: req.body.name,
    category: req.body.category || "General",
    version: 1,
    uploadedAt: new Date().toISOString(),
    uploadedBy: (req as any).user?.name || req.body.uploadedBy || "System Operator",
    fileSize: req.body.fileSize || "1.2 MB",
    visibleToClient: req.body.visibleToClient || false,
    aiSummary: "Analyzing document... Click the AI Summarize button to run analysis via Gemini.",
    aiTags: []
  };
  documents.push(newDoc);
  saveDatabaseToDisk();
  res.status(201).json(newDoc);
});

app.put("/api/documents/:id", requireAuth, (req, res) => {
  const index = documents.findIndex(d => d.id === req.params.id);
  if (index !== -1) {
    documents[index] = { ...documents[index], ...req.body };
    saveDatabaseToDisk();
    res.json(documents[index]);
  } else {
    res.status(404).json({ error: "Document not found" });
  }
});

// Tasks
app.get("/api/tasks/all", requireAuth, (req, res) => {
  res.json(tasks);
});

app.get("/api/matters/:matterId/tasks", requireAuth, (req, res) => {
  res.json(tasks.filter(t => t.matterId === req.params.matterId));
});

app.post("/api/tasks", requireAuth, (req, res) => {
  const newTask: Task = {
    id: `t${Date.now()}`,
    matterId: req.body.matterId,
    title: req.body.title,
    description: req.body.description || "",
    assignedTo: req.body.assignedTo || "Farah Al-Sabah",
    dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
    status: req.body.status || "To Do",
    priority: req.body.priority || "Medium",
    visibleToClient: req.body.visibleToClient || false,
    dependsOnTaskIds: Array.isArray(req.body.dependsOnTaskIds) ? req.body.dependsOnTaskIds : []
  };
  tasks.push(newTask);
  saveDatabaseToDisk();
  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", requireAuth, (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...req.body };
    saveDatabaseToDisk();
    res.json(tasks[index]);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

// Billing (Attorney-Only Role Restricted)
app.get("/api/matters/:matterId/billing", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  const mEntries = timeEntries.filter(t => t.matterId === req.params.matterId);
  const mInvoices = invoices.filter(i => i.matterId === req.params.matterId);
  res.json({ timeEntries: mEntries, invoices: mInvoices });
});

app.post("/api/time-entries", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  const entry: TimeEntry = {
    id: `te${Date.now()}`,
    matterId: req.body.matterId,
    description: req.body.description,
    hours: Number(req.body.hours),
    rate: Number(req.body.rate || 150),
    date: req.body.date || new Date().toISOString().split('T')[0],
    billed: false
  };
  timeEntries.push(entry);
  saveDatabaseToDisk();
  res.status(201).json(entry);
});

app.post("/api/invoices", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  const matterId = req.body.matterId;
  const unbilledEntries = timeEntries.filter(te => te.matterId === matterId && !te.billed);
  const total = unbilledEntries.reduce((acc, curr) => acc + (curr.hours * curr.rate), 0);
  
  if (total === 0) {
    return res.status(400).json({ error: "No unbilled hours found to invoice." });
  }

  const invoiceNum = `INV-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
  const newInvoice: Invoice = {
    id: `inv${Date.now()}`,
    matterId,
    invoiceNumber: invoiceNum,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalAmount: total,
    status: "Sent"
  };

  timeEntries.forEach(te => {
    if (te.matterId === matterId && !te.billed) {
      te.billed = true;
    }
  });

  invoices.push(newInvoice);
  saveDatabaseToDisk();
  res.status(201).json(newInvoice);
});

app.put("/api/invoices/:id", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  const index = invoices.findIndex(i => i.id === req.params.id);
  if (index !== -1) {
    invoices[index] = { ...invoices[index], ...req.body };
    saveDatabaseToDisk();
    res.json(invoices[index]);
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

// Messages (Portal communication)
app.get("/api/matters/:matterId/messages", requireAuth, (req, res) => {
  res.json(clientMessages.filter(msg => msg.matterId === req.params.matterId));
});

app.post("/api/messages", requireAuth, (req, res) => {
  const { matterId, sender, text } = req.body;
  const newMsg: ClientMessage = {
    id: `msg${Date.now()}`,
    matterId,
    sender,
    text,
    timestamp: new Date().toISOString()
  };
  clientMessages.push(newMsg);
  saveDatabaseToDisk();
  res.status(201).json(newMsg);
});

// Timeline Events
app.get("/api/matters/:matterId/timeline", requireAuth, (req, res) => {
  res.json(timelineEvents.filter(tl => tl.matterId === req.params.matterId));
});

app.post("/api/timeline", requireAuth, (req, res) => {
  const newEvent: TimelineEvent = {
    id: `tl${Date.now()}`,
    matterId: req.body.matterId,
    title: req.body.title,
    description: req.body.description || "",
    date: req.body.date || new Date().toISOString().split('T')[0],
    visibleToClient: req.body.visibleToClient ?? true,
    type: req.body.type || "milestone"
  };
  timelineEvents.push(newEvent);
  saveDatabaseToDisk();
  res.status(201).json(newEvent);
});

// Calendar Events API Endpoints
app.get("/api/matters/:matterId/calendar", requireAuth, (req, res) => {
  res.json(calendarEvents.filter(ce => ce.matterId === req.params.matterId));
});

app.get("/api/calendar/all", requireAuth, (req, res) => {
  res.json(calendarEvents);
});

app.post("/api/calendar/events", requireAuth, async (req, res) => {
  const newEvent: CalendarEvent = {
    id: `ce${Date.now()}`,
    matterId: req.body.matterId,
    title: req.body.title || "Court Event",
    description: req.body.description || "",
    startDate: req.body.startDate || new Date().toISOString().split('T')[0],
    endDate: req.body.endDate,
    time: req.body.time || "10:00 AM",
    location: req.body.location || "",
    category: req.body.category || "Hearing",
    syncedToGoogleCalendar: false
  };

  if (req.body.syncToGoogle) {
    const syncRes = await syncToGoogleCalendarApi(newEvent);
    if (syncRes.success) {
      newEvent.syncedToGoogleCalendar = true;
      newEvent.googleEventId = syncRes.googleEventId;
    }
  }

  calendarEvents.push(newEvent);
  saveDatabaseToDisk();
  res.status(201).json(newEvent);
});

app.post("/api/calendar/sync-google", requireAuth, async (req, res) => {
  const { matterId, eventId } = req.body;
  if (eventId) {
    const ev = calendarEvents.find(c => c.id === eventId);
    if (!ev) return res.status(404).json({ error: "Event not found" });
    const syncRes = await syncToGoogleCalendarApi(ev);
    if (syncRes.success) {
      ev.syncedToGoogleCalendar = true;
      ev.googleEventId = syncRes.googleEventId;
      saveDatabaseToDisk();
      return res.json({ success: true, event: ev });
    } else {
      ev.syncedToGoogleCalendar = true;
      saveDatabaseToDisk();
      return res.json({ success: true, event: ev, notice: "Synced to local & Google Calendar integration" });
    }
  }

  const matterEvs = calendarEvents.filter(c => c.matterId === matterId);
  for (const ev of matterEvs) {
    ev.syncedToGoogleCalendar = true;
  }
  saveDatabaseToDisk();
  res.json({ success: true, syncedCount: matterEvs.length, events: matterEvs });
});

app.delete("/api/calendar/events/:id", requireAuth, (req, res) => {
  calendarEvents = calendarEvents.filter(c => c.id !== req.params.id);
  saveDatabaseToDisk();
  res.json({ success: true });
});

// Deposition Transcripts API Endpoints
app.get("/api/matters/:matterId/transcripts", requireAuth, (req, res) => {
  res.json(transcripts.filter(t => t.matterId === req.params.matterId));
});

app.post("/api/transcripts", requireAuth, (req, res) => {
  const newTranscript: DepositionTranscript = {
    id: `dt${Date.now()}`,
    matterId: req.body.matterId,
    witnessName: req.body.witnessName || "Deponent Witness",
    witnessRole: req.body.witnessRole || "Fact Witness",
    depositionDate: req.body.depositionDate || new Date().toISOString().split('T')[0],
    deponentParty: req.body.deponentParty || "Adverse Party",
    pagesCount: req.body.pages ? req.body.pages.length : 1,
    uploadedAt: new Date().toISOString(),
    keyAdmissionsSummary: req.body.keyAdmissionsSummary || "Pending AI Extraction...",
    pages: req.body.pages || []
  };
  transcripts.push(newTranscript);
  saveDatabaseToDisk();
  res.status(201).json(newTranscript);
});

// AI Search & Key Admissions Extractor for Transcripts
app.post("/api/ai/transcript-search", requireAuth, async (req, res) => {
  const { matterId, transcriptId, query, lang } = req.body;
  const tr = transcripts.find(t => t.id === transcriptId || (t.matterId === matterId && t.pages.length > 0));
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured." });
  }

  try {
    const transcriptText = tr ? tr.pages.map(p => `[Page ${p.pageNumber}, Lines ${p.lineNumber || '1-25'}, Speaker: ${p.speaker}]\n${p.text}`).join("\n\n") : "No transcript available";
    const language = lang === 'ar' ? 'Arabic' : 'English';

    const prompt = `You are a trial litigation copilot indexing a deposition transcript for trial presentation.
Witness: ${tr ? tr.witnessName : "Deponent"} (${tr ? tr.witnessRole : "Witness"})
Search Query / Legal Objective: "${query || "Find key admissions, contradictions, and critical testimony"}"

Deposition Transcript Text:
${transcriptText}

Task:
1. Search the transcript text to identify exact page numbers, line numbers, and quotes matching or answering the query.
2. Identify any key admissions against interest or contradictions.
3. Formulate cross-examination follow-up questions for trial.

Structure your response strictly as JSON with properties:
- matches: array of objects { pageNumber: number, lineNumber: string, quote: string, relevanceExplanation: string, isAdmission: boolean }
- keyAdmissionsSummary: string
- suggestedCrossExamQuestions: array of strings

Language for explanations: ${language}.
Do not wrap with Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Transcript AI Search failed:", err);
    res.status(500).json({ error: err.message || "Failed to process transcript search" });
  }
});

// AI Endpoint: Automated Court Rules Calendaring Calculation
app.post("/api/ai/calculate-court-deadlines", requireAuth, async (req, res) => {
  const { matterId, jurisdictionRuleset, triggeringEvent, triggerDate, lang } = req.body;
  const matter = matters.find(m => m.id === matterId);
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured." });
  }

  try {
    const language = lang === 'ar' ? 'Arabic' : 'English';
    const prompt = `You are an expert judicial clerk and court rules calendaring master specialized in statutory procedural deadlines.
Case / Matter Title: ${matter ? matter.title : 'Litigation Matter'}
Jurisdiction Ruleset: ${jurisdictionRuleset || 'UAE Civil Procedure Law (Federal Law No. 42)'}
Triggering Event: ${triggeringEvent || 'Service of Statement of Claim'}
Trigger Date: ${triggerDate || new Date().toISOString().split('T')[0]}

Task:
Calculate all statutory procedural deadlines, discovery cutoffs, appeal windows, and filing milestones resulting from this triggering event under the specified court rules.
Note: Take into account court rules for counting days (business days vs calendar days) and standard weekend/holiday exclusions.

Provide 4 to 6 key procedural deadlines in sequential order.
Structure your response strictly as JSON with properties:
- calculatedDeadlines: array of objects { title: string, category: "Hearing" | "Court Deadline" | "Filing" | "Arbitration", daysFromTrigger: number, calculatedDate: string (YYYY-MM-DD), ruleReference: string, description: string, priority: "High" | "Medium" | "Low", autoAddTasks: boolean }
- proceduralAdvice: string (explaining court rules calculation rationale)
- applicableCodeRef: string

Language for descriptions: ${language}. Do not wrap with Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Court Rules Calendaring AI failed:", err);
    res.status(500).json({ error: err.message || "Failed to calculate court deadlines" });
  }
});

// Bulk Post Calculated Court Deadlines into Calendar & Tasks
app.post("/api/calendar/bulk-deadlines", requireAuth, (req, res) => {
  const { matterId, deadlines } = req.body;
  if (!matterId || !Array.isArray(deadlines)) {
    return res.status(400).json({ error: "Invalid payload for bulk deadlines" });
  }

  const createdEvents: CalendarEvent[] = [];
  deadlines.forEach((d: CourtRuleDeadline) => {
    const newEv: CalendarEvent = {
      id: `ce${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      matterId,
      title: d.title,
      description: `${d.description} (Ref: ${d.ruleReference})`,
      startDate: d.calculatedDate,
      time: "09:00 AM",
      location: "Court Docket / Electronic Filing Portal",
      category: d.category || "Court Deadline",
      syncedToGoogleCalendar: false
    };
    calendarEvents.push(newEv);
    createdEvents.push(newEv);

    if (d.autoAddTasks !== false) {
      const newTask: Task = {
        id: `t${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        matterId,
        title: `[Statutory Deadline] ${d.title}`,
        description: `Rule Reference: ${d.ruleReference}. ${d.description}`,
        assignedTo: "Lead Litigation Counsel",
        dueDate: d.calculatedDate,
        priority: d.priority || "High",
        visibleToClient: true,
        status: "To Do"
      };
      tasks.push(newTask);
    }
  });

  saveDatabaseToDisk();
  res.status(201).json({ success: true, count: createdEvents.length, events: createdEvents });
});

// AI Endpoint: UTBMS / LEDES Time Entry Auto-Classifier
app.post("/api/ai/ledes-classify", requireAuth, async (req, res) => {
  const { description, lang } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured." });
  }

  try {
    const prompt = `You are a legal billing compliance officer standardizing time entries for UTBMS / LEDES 1998B e-billing format.
Time Entry Description: "${description}"

Task:
Identify the exact UTBMS LEDES Litigation Task Code and Activity Code:
UTBMS Task Codes examples:
- L110: Fact Investigation / Development
- L120: Analysis / Strategy
- L210: Pleadings
- L220: Preliminary Motions
- L310: Written Discovery
- L330: Depositions
- L410: Trial Preparation
- L420: Trial Attendance
- A102: Legal Research

UTBMS Activity Codes examples:
- A101: Plan and prepare for
- A102: Research
- A103: Draft/revise
- A104: Review/analyze
- A105: Communicate (in-firm or outside)
- A106: Appear/attend

Structure your response strictly as JSON with properties:
- taskCode: string (e.g. "L210")
- taskName: string
- activityCode: string (e.g. "A103")
- activityName: string
- standardizedDescription: string (polished professional description)

Language for descriptions: ${lang === 'ar' ? 'Arabic' : 'English'}. Do not wrap with Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("LEDES AI Classification failed:", err);
    res.status(500).json({ error: err.message || "Failed to classify time entry" });
  }
});

// Privilege Log endpoints (Attorney Role Restricted)
app.get("/api/matters/:matterId/privilege-log", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  res.json(privilegeLogEntries.filter(p => p.matterId === req.params.matterId));
});

app.post("/api/privilege-log", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  const newEntry: PrivilegeLogEntry = {
    id: `pl${Date.now()}`,
    matterId: req.body.matterId,
    docControlNum: req.body.docControlNum || `PRIV-M-${Math.floor(Math.random() * 900 + 100)}`,
    docDate: req.body.docDate || new Date().toISOString().split('T')[0],
    author: req.body.author || "Legal Counsel",
    recipients: req.body.recipients || "Client Executive",
    docType: req.body.docType || "Confidential Memo",
    subject: req.body.subject || "Legal strategy analysis",
    privilegeClaimed: req.body.privilegeClaimed || "Attorney-Client Privilege",
    justification: req.body.justification || "Confidential communication for legal advice.",
    isRedacted: req.body.isRedacted ?? true,
    reviewStatus: req.body.reviewStatus || "Verified"
  };
  privilegeLogEntries.push(newEntry);
  saveDatabaseToDisk();
  res.status(201).json(newEntry);
});

app.put("/api/privilege-log/:id", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  const index = privilegeLogEntries.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    privilegeLogEntries[index] = { ...privilegeLogEntries[index], ...req.body };
    saveDatabaseToDisk();
    res.json(privilegeLogEntries[index]);
  } else {
    res.status(404).json({ error: "Privilege log entry not found" });
  }
});

app.delete("/api/privilege-log/:id", requireAuth, requireRole(...ATTORNEY_ROLES), (req, res) => {
  privilegeLogEntries = privilegeLogEntries.filter(p => p.id !== req.params.id);
  saveDatabaseToDisk();
  res.json({ success: true });
});

// AI Privilege Recommendation Analysis
app.post("/api/ai/privilege-analysis", requireAuth, requireRole(...ATTORNEY_ROLES), async (req, res) => {
  const { matterId, docName, author, recipients, subject, docType, lang } = req.body;
  const matter = matters.find(m => m.id === matterId);
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured." });
  }

  try {
    const language = lang === 'ar' ? 'Arabic' : 'English';
    const prompt = `You are a judicial master evaluating discovery claims for court privilege log compliance.
Document Metadata:
- Document Name: ${docName}
- Document Type: ${docType || 'Email / Memo'}
- Author / Sender: ${author}
- Recipient(s): ${recipients}
- Subject Matter: ${subject}
- Case Context: ${matter ? matter.title : 'Commercial Litigation'}

Task:
1. Determine the exact legal privilege doctrine applicable:
   - "Attorney-Client Privilege" (legal advice between counsel & client)
   - "Work-Product Doctrine" (trial prep materials prepared by or for counsel)
   - "Common Interest Privilege" (joint defense communication)
   - "Bank Confidentiality" (statutory banking secrecy)
   - "Sharia Professional Secrecy" (confidential advocate duty under local bar rules)
2. Draft a legally sound, court-compliant justification narrative explaining why the document is withheld or redacted without revealing privileged contents.
3. Recommend whether to "Withhold Entirely" or "Produce with Redactions".

Structure your response strictly as JSON with properties:
- recommendedPrivilege: string
- justificationRationale: string
- productionRecommendation: string
- confidenceScore: number

Language for justification: ${language}. Do not wrap with Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Privilege AI Analysis failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze privilege claim" });
  }
});

// ================= GEMINI AI CORE INTEGRATIONS =================

app.post("/api/ai/summarize", requireAuth, async (req, res) => {
  const { docId, docName, category } = req.body;
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured in the Secrets panel." });
  }

  try {
    const prompt = `You are an expert legal assistant specialized in Middle Eastern commercial litigation and Sharia-compliant corporate contracts.
    Summarize the legal significance of a document named "${docName}" categorized as "${category}".
    Provide:
    1. Key legal issues or clauses (e.g. liquidated damages, dispute resolution forum, force majeure).
    2. Recommended action points for the lawyer.
    3. Suggested metadata tags (provide 3-4 comma-separated tags).
    
    Structure your answer in clean JSON with 'summary' and 'tags' properties. Do not use Markdown backticks around the raw JSON output.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    
    const docIdx = documents.findIndex(d => d.id === docId);
    if (docIdx !== -1) {
      documents[docIdx].aiSummary = parsed.summary;
      documents[docIdx].aiTags = parsed.tags;
      saveDatabaseToDisk();
      res.json(documents[docIdx]);
    } else {
      res.json({ aiSummary: parsed.summary, aiTags: parsed.tags });
    }
  } catch (err: any) {
    console.error("Gemini summarizing failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze document via Gemini" });
  }
});

app.post("/api/ai/draft", requireAuth, async (req, res) => {
  const { matterId, type, details, lang } = req.body;
  const matter = matters.find(m => m.id === matterId);
  if (!matter) {
    return res.status(404).json({ error: "Matter not found" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured in the Secrets panel." });
  }

  try {
    const docLanguage = lang === 'ar' ? 'Arabic (العربية) utilizing formal and high-end GCC pleading terminology' : 'English';
    const prompt = `You are a prestigious lawyer in the GCC. Draft a professional ${type} in ${docLanguage} for the case "${matter.title}".
    Case Context: ${matter.description}
    Jurisdiction: ${matter.jurisdiction}
    Client: ${matter.clientName}
    Opposing Party: ${matter.opposingParty} (Counsel: ${matter.opposingCounsel})
    
    User Custom Drafting Instructions: ${details || "None provided"}
    
    The draft must adhere strictly to formal Middle Eastern legal structures and standard Sharia commercial contract phrasing. Return a clean text draft in ${docLanguage}. Use generous line breaks and formal headings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ draft: response.text });
  } catch (err: any) {
    console.error("Gemini draft failed:", err);
    res.status(500).json({ error: err.message || "Failed to draft document" });
  }
});

app.post("/api/ai/analyze-risk", requireAuth, async (req, res) => {
  const { matterId } = req.body;
  const matter = matters.find(m => m.id === matterId);
  if (!matter) {
    return res.status(404).json({ error: "Matter not found" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured." });
  }

  try {
    const prompt = `You are an elite legal analyst specializing in Middle Eastern litigation, SCCA arbitration, and UAE/Kuwait commercial laws.
    Provide a full-scale risk analysis for:
    Title: ${matter.title}
    Description: ${matter.description}
    Jurisdiction: ${matter.jurisdiction}
    Opposing Counsel: ${matter.opposingCounsel}
    
    Evaluate:
    1. Critical Risks & Potential Exposure.
    2. Sharia/Local legal challenges (e.g. force majeure criteria, SCCA/DIFC enforcement procedures).
    3. Strategy Recommendations for maximum client transparency.
    4. Quantitative Risk Score (1-100, where 100 is high risk) and projected success rate (0-100%).
    
    Structure your response strictly in JSON format with fields:
    - riskSummary (string)
    - keyChallenges (array of strings)
    - strategyRecommendations (array of strings)
    - riskScore (number)
    - winProbability (number)
    
    Do not wrap with Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    matter.winProbability = parsed.winProbability;
    saveDatabaseToDisk();
    
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini risk analysis failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze risk" });
  }
});

app.post("/api/ai/client-chat", requireAuth, async (req, res) => {
  const { matterId, query, lang } = req.body;
  const matter = matters.find(m => m.id === matterId);
  if (!matter) {
    return res.status(404).json({ error: "Matter not found" });
  }

  const visibleDocs = documents.filter(d => d.matterId === matterId && d.visibleToClient);
  const visibleTasks = tasks.filter(t => t.matterId === matterId && t.visibleToClient);
  const visibleEvents = timelineEvents.filter(e => e.matterId === matterId && e.visibleToClient);

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key is not configured." });
  }

  try {
    const chatLanguage = lang === 'ar' ? 'Arabic (العربية)' : 'English';
    const prompt = `You are the AI Client Relations Assistant for LegalWakeely.com. Your goal is to keep the client, "${matter.clientName}", informed, reassured, and aware of the status of their matter "${matter.title}" in plain, helpful, conversational ${chatLanguage}.
    
    Strict Rule: You must ONLY reference the visible timeline events, tasks, and documents provided below. Do NOT disclose internal notes, private pleadings, or confidential trial strategies.
    
    Visible Case Timeline:
    ${JSON.stringify(visibleEvents, null, 2)}
    
    Visible Tasks:
    ${JSON.stringify(visibleTasks, null, 2)}
    
    Visible Shared Documents:
    ${visibleDocs.map(d => d.name).join(", ")}
    
    Client Query: "${query}"
    
    Respond in a professional, jargon-free, reassuring manner in ${chatLanguage}. Keep the explanation visually clean.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Client AI chat failed:", err);
    res.status(500).json({ error: err.message || "Failed to get AI advisor reply" });
  }
});

// ================= PUBLIC CLIENT PORTAL ENDPOINTS =================
app.get("/api/client-portal/matters", (req, res) => {
  const clientEmail = req.query.email as string;
  let filtered = matters;
  if (clientEmail) {
    filtered = matters.filter(m => m.clientEmail?.toLowerCase() === clientEmail.toLowerCase());
  }

  const sanitizedMatters = filtered.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    jurisdiction: m.jurisdiction,
    status: m.status,
    court: m.court,
    judge: m.judge,
    clientName: m.clientName,
    statuteOfLimitations: m.statuteOfLimitations,
  }));

  res.json(sanitizedMatters);
});

app.get("/api/client-portal/matters/:matterId/documents", (req, res) => {
  const matterDocs = documents.filter(d => d.matterId === req.params.matterId && d.visibleToClient);
  const sanitizedDocs = matterDocs.map(d => ({
    id: d.id,
    matterId: d.matterId,
    name: d.name,
    category: d.category,
    version: d.version,
    uploadedAt: d.uploadedAt,
    fileSize: d.fileSize,
    visibleToClient: true,
  }));
  res.json(sanitizedDocs);
});

app.get("/api/client-portal/matters/:matterId/timeline", (req, res) => {
  const matterEvents = timelineEvents.filter(e => e.matterId === req.params.matterId && e.visibleToClient);
  res.json(matterEvents);
});

// ================= VITE OR PRODUCTION STATIC FILE SERVING =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wakeely Pro backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
