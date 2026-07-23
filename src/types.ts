export interface Matter {
  id: string;
  title: string;
  description?: string;
  clientName: string;
  clientEmail: string;
  jurisdiction: string;
  opposingParty: string;
  opposingCounsel: string;
  budget: number;
  expenses: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  winProbability: number;
  judge: string;
  court?: string;
  statuteOfLimitations?: string;
  statuteDeadline?: string;
  status?: string;
  aiStrategy?: string;
}

export interface Document {
  id: string;
  matterId: string;
  name: string;
  category: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  visibleToClient: boolean;
  version: number;
  aiSummary?: string;
  aiTags?: string[];
  isRedacted?: boolean;
  redactedVersionId?: string;
  redactionCount?: number;
}

export interface Task {
  id: string;
  matterId: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  visibleToClient: boolean;
  status: 'To Do' | 'In Progress' | 'Under Review' | 'Completed';
  dependsOnTaskIds?: string[];
}

export interface TimeEntry {
  id: string;
  matterId: string;
  description: string;
  hours: number;
  rate: number;
  date: string;
  billed: boolean;
  taskCode?: string; // UTBMS Task Code e.g. L110, L210, L310
  activityCode?: string; // UTBMS Activity Code e.g. A101, A103, A105
  isBillable?: boolean;
}

export interface CourtRuleDeadline {
  id?: string;
  title: string;
  category: 'Hearing' | 'Court Deadline' | 'Filing' | 'Arbitration';
  daysFromTrigger: number;
  calculatedDate: string;
  ruleReference: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  autoAddTasks?: boolean;
}

export interface Invoice {
  id: string;
  matterId: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  dueDate: string;
  issueDate?: string;
  paymentTxId?: string;
}

export interface ClientMessage {
  id: string;
  matterId: string;
  sender: 'Lawyer' | 'Client';
  text: string;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  matterId: string;
  title: string;
  description: string;
  date: string;
  visibleToClient: boolean;
  type?: string;
}

export interface CalendarEvent {
  id: string;
  matterId: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  category: 'Hearing' | 'Court Deadline' | 'Client Meeting' | 'Filing' | 'Arbitration';
  syncedToGoogleCalendar?: boolean;
  googleEventId?: string;
}

export interface TranscriptPage {
  pageNumber: number;
  lineNumber?: string;
  timestamp?: string;
  speaker: string;
  text: string;
  isKeyAdmission?: boolean;
  tags?: string[];
}

export interface DepositionTranscript {
  id: string;
  matterId: string;
  witnessName: string;
  witnessRole: string;
  depositionDate: string;
  deponentParty: 'Fact Witness' | 'Expert Witness' | 'Adverse Party' | 'Client Corporate Representative';
  pagesCount: number;
  pages: TranscriptPage[];
  keyAdmissionsSummary?: string;
  uploadedAt: string;
}

export interface PrivilegeLogEntry {
  id: string;
  matterId: string;
  docControlNum: string;
  docDate: string;
  author: string;
  recipients: string;
  docType: string;
  subject: string;
  privilegeClaimed: 'Attorney-Client Privilege' | 'Work-Product Doctrine' | 'Common Interest Privilege' | 'Bank Confidentiality' | 'Sharia Professional Secrecy';
  justification: string;
  isRedacted?: boolean;
  reviewStatus: 'Flagged' | 'Verified' | 'Withheld';
}

