import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Matter, Document, Task, TimeEntry, Invoice, ClientMessage, TimelineEvent } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Global In-Memory Database for Wakeely Pro
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
    visibleToClient: true
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
    visibleToClient: false
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
    visibleToClient: true
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
    visibleToClient: false
  }
];

let timeEntries: TimeEntry[] = [
  {
    id: "te1",
    matterId: "m1",
    description: "Review of SLA and gate logs",
    hours: 3.5,
    rate: 150, // 150 JOD/hour
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
    totalAmount: 525, // 3.5 hours * 150 JOD
    status: "Paid",
    paymentTxId: "TXN-9021-384"
  },
  {
    id: "inv2",
    matterId: "m1",
    invoiceNumber: "INV-2026-0094",
    issueDate: "2026-07-19",
    dueDate: "2026-08-05",
    totalAmount: 330, // 2.2 hours * 150 JOD
    status: "Sent"
  },
  {
    id: "inv3",
    matterId: "m2",
    invoiceNumber: "INV-2026-0082",
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    totalAmount: 375, // 1.5 hours * 250 JOD
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

// ================= API ENDPOINTS =================

// Search endpoint for global search across all entities
app.get("/api/all-searchable-data", (req, res) => {
  res.json({
    matters,
    documents,
    tasks
  });
});

// Matters
app.get("/api/matters", (req, res) => {
  res.json(matters);
});

app.post("/api/matters", (req, res) => {
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
  res.status(201).json(newMatter);
});

app.put("/api/matters/:id", (req, res) => {
  const index = matters.findIndex(m => m.id === req.params.id);
  if (index !== -1) {
    matters[index] = { ...matters[index], ...req.body };
    res.json(matters[index]);
  } else {
    res.status(404).json({ error: "Matter not found" });
  }
});

// Documents
app.get("/api/matters/:matterId/documents", (req, res) => {
  res.json(documents.filter(d => d.matterId === req.params.matterId));
});

app.post("/api/documents", (req, res) => {
  const newDoc: Document = {
    id: `d${Date.now()}`,
    matterId: req.body.matterId,
    name: req.body.name,
    category: req.body.category || "General",
    version: 1,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.body.uploadedBy || "System Operator",
    fileSize: req.body.fileSize || "1.2 MB",
    visibleToClient: req.body.visibleToClient || false,
    aiSummary: "Analyzing document... Click the AI Summarize button to run analysis via Gemini.",
    aiTags: []
  };
  documents.push(newDoc);
  res.status(201).json(newDoc);
});

app.put("/api/documents/:id", (req, res) => {
  const index = documents.findIndex(d => d.id === req.params.id);
  if (index !== -1) {
    documents[index] = { ...documents[index], ...req.body };
    res.json(documents[index]);
  } else {
    res.status(404).json({ error: "Document not found" });
  }
});

// Tasks
app.get("/api/matters/:matterId/tasks", (req, res) => {
  res.json(tasks.filter(t => t.matterId === req.params.matterId));
});

app.post("/api/tasks", (req, res) => {
  const newTask: Task = {
    id: `t${Date.now()}`,
    matterId: req.body.matterId,
    title: req.body.title,
    description: req.body.description || "",
    assignedTo: req.body.assignedTo || "Farah Al-Sabah",
    dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
    status: req.body.status || "To Do",
    priority: req.body.priority || "Medium",
    visibleToClient: req.body.visibleToClient || false
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...req.body };
    res.json(tasks[index]);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

// Billing
app.get("/api/matters/:matterId/billing", (req, res) => {
  const mEntries = timeEntries.filter(t => t.matterId === req.params.matterId);
  const mInvoices = invoices.filter(i => i.matterId === req.params.matterId);
  res.json({ timeEntries: mEntries, invoices: mInvoices });
});

app.post("/api/time-entries", (req, res) => {
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
  res.status(201).json(entry);
});

app.post("/api/invoices", (req, res) => {
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

  // Mark entries as billed
  timeEntries.forEach(te => {
    if (te.matterId === matterId && !te.billed) {
      te.billed = true;
    }
  });

  invoices.push(newInvoice);
  res.status(201).json(newInvoice);
});

app.put("/api/invoices/:id", (req, res) => {
  const index = invoices.findIndex(i => i.id === req.params.id);
  if (index !== -1) {
    invoices[index] = { ...invoices[index], ...req.body };
    res.json(invoices[index]);
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

// Messages (Portal communication)
app.get("/api/matters/:matterId/messages", (req, res) => {
  res.json(clientMessages.filter(msg => msg.matterId === req.params.matterId));
});

app.post("/api/messages", (req, res) => {
  const { matterId, sender, text } = req.body;
  const newMsg: ClientMessage = {
    id: `msg${Date.now()}`,
    matterId,
    sender,
    text,
    timestamp: new Date().toISOString()
  };
  clientMessages.push(newMsg);
  res.status(201).json(newMsg);
});

// Timeline Events
app.get("/api/matters/:matterId/timeline", (req, res) => {
  res.json(timelineEvents.filter(tl => tl.matterId === req.params.matterId));
});

app.post("/api/timeline", (req, res) => {
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
  res.status(201).json(newEvent);
});

// ================= GEMINI AI CORE INTEGRATIONS =================

// AI End-point: Summarize Document
app.post("/api/ai/summarize", async (req, res) => {
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
    
    // Update document in database
    const docIdx = documents.findIndex(d => d.id === docId);
    if (docIdx !== -1) {
      documents[docIdx].aiSummary = parsed.summary;
      documents[docIdx].aiTags = parsed.tags;
      res.json(documents[docIdx]);
    } else {
      res.json({ aiSummary: parsed.summary, aiTags: parsed.tags });
    }
  } catch (err: any) {
    console.error("Gemini summarizing failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze document via Gemini" });
  }
});

// AI End-point: Draft Document or notice
app.post("/api/ai/draft", async (req, res) => {
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
    
    The draft must adhere strictly to formal Middle Eastern legal structures and standard Sharia commercial contract phrasing (e.g., FIDIC compliance if construction, standard notifications, warning of litigation steps). Return a clean text draft in ${docLanguage}. Use generous line breaks and formal headings.`;

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

// AI End-point: Risk Assessment & Case Analysis
app.post("/api/ai/analyze-risk", async (req, res) => {
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
    
    // Update local matter winProbability if appropriate
    matter.winProbability = parsed.winProbability;
    
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini risk analysis failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze risk" });
  }
});

// Client Mode AI Advisor: translates status updates safely
app.post("/api/ai/client-chat", async (req, res) => {
  const { matterId, query, lang } = req.body;
  const matter = matters.find(m => m.id === matterId);
  if (!matter) {
    return res.status(404).json({ error: "Matter not found" });
  }

  // Gather only shared/visible information for the client to protect work product
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

// ================= VITE OR PRODUCTION STATIC FILE SERVING =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite development server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
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
