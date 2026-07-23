# Wakeely Pro (وكيلك المحترف) — Enterprise Legal Practice & Litigation Management Platform

**Wakeely Pro** is a high-grade, full-stack, AI-powered litigation and legal practice management system built specifically for top-tier law firms, regional corporate legal departments, and international arbitration counsel operating in bilingual (Arabic & English) jurisdictions across Jordan, Saudi Arabia, the UAE (DIFC/ADGM), and international tribunals.

---

## 🌟 Key Functional Capabilities

### 1. ⚖️ Litigation Matter Management & Privilege Log
- **Case Lifecycle Tracking**: Complete management of litigation, commercial arbitration, regulatory investigations, and IP disputes.
- **Privilege Log Matrix**: Full compliance with attorney-client privilege, work product doctrine, and statutory secrecy laws with exportable PDF/Excel logs.
- **Biometric Lock Controls**: Hardware-grade biometric (WebAuthn / Passkey / Pin) authorization for high-stakes, strictly confidential matters.

### 2. 🏛️ Automated Court Rules Calendaring Engine
- **Statutory Procedure Calculation**: Powered by Gemini 3.5 Flash, automatically calculates procedural court deadlines, discovery cutoffs, and appeal windows based on:
  - UAE Civil Procedure Law (Federal Law No. 42 / 2022)
  - Saudi Commercial Courts Law (Royal Decree M/93)
  - DIFC Courts Rules (RDC 2014) & ADGM Rules
  - US Federal Rules of Civil Procedure (FRCP)
- **Bulk Calendar & Task Integration**: Instantly schedules calculated deadlines directly into the matter's calendar docket and assigns tasks to lead counsel.

### 3. 📄 Document Versioning, AI Redaction & Bate Stamping
- **Interactive Multi-Page Redaction Canvas**: Select text or draw visual bounding boxes to permanently obscure sensitive PII, trade secrets, or banking details.
- **Automatic Pattern Redaction**: One-click regex & AI pattern scanning for IBANs, Passport numbers, Civil IDs, and National ID numbers.
- **Sequential Bates Stamping**: Apply customizable sequential Bates numbers (e.g. `AL-HIKMAH-001042`) across produced court exhibits.
- **Document Version Control**: Differential version history, rollback, and author tracking.

### 4. 🎙️ AI Deposition & Hearing Transcript Indexer
- **AI Speaker Diarization**: Multi-speaker transcript indexing with minute-by-minute speaker segmentation.
- **Key Testimony Extraction**: Auto-extracts key admissions, factual contradictions, and cross-examination highlights with exact timestamps.

### 5. 💰 UTBMS / LEDES 1998B Billing & Active Stopwatch
- **Live Active Stopwatch**: Precision timekeeping timer with instant conversion to billable hours and JOD/USD amounts.
- **AI UTBMS Classifier**: Auto-classifies time entry descriptions into LEDES 1998B Litigation Task Codes (L110–L420) and Activity Codes (A101–A106).
- **LEDES 1998B Export**: One-click generation of pipe-delimited `.txt` LEDES files for corporate e-billing portals.
- **Itemized Statement of Account**: Professional PDF print view with VAT/tax calculations.

### 6. 📊 Cross-Case Kanban Board & Dependency Matrix
- **Unified Workflow Board**: Switch between Single-Case Kanban and Firm-Wide Cross-Case Task Boards.
- **Task Dependency Locks**: Enforces strict procedural sequences (e.g. Task B is locked until Task A is signed off).

### 7. ⚔️ Trial War Room & Hearing Binder (`WarRoomModule`)
- **Witness Examination Binders**: Fact witness, expert witness, and adverse party outlines with attack vector lists.
- **Master Trial Exhibit Ledger**: Plaintiff (P-1..P-50) & Defendant (D-1..D-50) tracking with court admission statuses (Admitted, Marked, Objected/Excluded).
- **AI Rebuttal Generator**: Real-time Gemini copilot for generating instant statutory counter-arguments during active trial proceedings.

### 8. 🛡️ Ethics & Conflict of Interest Check Engine (`ConflictCheckModal`)
- **Instant Entity Search**: Searches parties, commercial registration (CR) numbers, corporate parents, subsidiaries, and key executives across all firm matters.
- **Ethical Clearance Certificates**: Generates verifiable compliance certificates (`WKL-ETH-XXXXXX`).
- **Ethical Wall Isolation**: Instant one-click establishment of information barriers on conflicting matters.

### 9. 🤝 Secure Client Portal
- **Client Transparency Dashboard**: Encrypted portal for clients to view case progress, review shared public filings, and inspect unbilled time entries.
- **Real-Time Encrypted Messaging**: Direct client-attorney communication channel.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Canvas API.
- **Backend**: Node.js, Express.js (Full-stack integrated server on port 3000).
- **AI Engine**: Google Gemini API (`@google/genai` with `gemini-3.5-flash`).
- **Offline Resilience**: Service Worker + IndexedDB offline caching layer (PWA ready).
- **Localization**: Native RTL/LTR dual-engine with full Arabic (`ar`) and English (`en`) support.

---

## 🚀 Quickstart & Setup Guide

### 1. Requirements
- Node.js 18+ or 20+
- Gemini API Key configured in process environment (`GEMINI_API_KEY`)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Ensure `GEMINI_API_KEY` is set inside `.env`.

### 3. Running Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Production Build
```bash
npm run build
npm start
```

---

## 🧪 Quick Verification & Testing Checklist

| Module | Test Procedure | Expected Outcome |
| :--- | :--- | :--- |
| **Court Rules Engine** | Open Calendar -> Click "Court Rules Calculator" -> Select "UAE Civil Procedure Law" -> Click "Auto-Calculate" | 4-6 procedural deadlines returned with statutory rules citations and option to bulk sync. |
| **AI Redaction** | Open Documents -> Click "Redact & Stamp" on any document -> Use Auto-Redact IBAN or visual box -> Click "Apply & Render" | Redacted PDF/canvas preview generated with blacked-out areas and Bates Stamp. |
| **LEDES Billing** | Open Billing -> Start Stopwatch -> Wait 5s -> Click "Stop & Log Time" -> Click "AI UTBMS Auto-Classify" -> Export LEDES 1998B | Standardized UTBMS Task/Activity code generated and `.txt` LEDES file downloaded. |
| **Cross-Case Kanban** | Open Tasks -> Toggle "Cross-Case Board" -> Filter by Matter or Assignee | Board displays tasks across all firm matters with case badges. |
| **Client Portal** | Toggle "Client Portal" view in header -> Inspect shared timeline, documents, and messages | Client sees filtered, public-facing case updates without internal confidential notes. |

---

## 🔒 Security & Compliance Notes

1. **Server-Side API Keys**: Gemini API calls are strictly routed through backend endpoints (`/api/ai/*`) to prevent API key exposure in client bundles.
2. **Redaction Guarantee**: Visual redactions are rendered directly onto document canvas representations prior to export to eliminate hidden text layers.
3. **Privilege Log Secrecy**: Privileged attorney notes and work products are stripped from client-facing API responses.
