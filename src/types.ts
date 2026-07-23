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
}

export interface TimeEntry {
  id: string;
  matterId: string;
  description: string;
  hours: number;
  rate: number;
  date: string;
  billed: boolean;
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

