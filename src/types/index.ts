export type ViewTab = 'command' | 'mandates' | 'approvals' | 'fairshare' | 'tools';

export type ToolSubTab = 'simulator' | 'dispute' | 'procurement' | 'cfo';

export interface AgentMandate {
  id: string;
  name: string;
  agentTag: string;
  category: string;
  icon: string;
  status: 'active' | 'paused' | 'sandbox';
  monthlyCap: number;
  spentAmount: number;
  perTxCap: number;
  approvalTrigger: number;
  whitelistedMerchants: string[];
  restrictedCategories: string[];
  autoDebitEnabled: boolean;
  expiryDate?: string;
  colorScheme?: 'primary' | 'secondary' | 'tertiary';
}

export interface TransactionActivity {
  id: string;
  mandateId?: string;
  title: string;
  merchant: string;
  timestamp: string;
  amount: number;
  status: 'approved' | 'blocked' | 'review';
  agentName: string;
  category: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  riskScore: number;
  badgeText: string;
  subText: string;
  paypalOrderId?: string;
  breachReason?: string;
}

export interface EscalatedApproval {
  id: string;
  mandateId?: string;
  merchant: string;
  agentName: string;
  amount: number;
  currency: string;
  category: 'high-risk' | 'cap-exceeded';
  icon: string;
  iconBg: string;
  iconColor: string;
  riskScore: number;
  riskLabel: string;
  ruleViolated: string;
  breachHeadline: string;
  breachPercent: string;
  breachExplanation: string;
  fundingWallet: string;
  availableBalance: string;
  contextImage: string;
  contextBadge: string;
  status: 'pending' | 'approved' | 'denied';
  paypalTransactionId?: string;
}

export interface FairShareItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
}

export interface FairShareBill {
  id: string;
  billNumber: string;
  name: string;
  date: string;
  items: FairShareItem[];
  total: number;
  tax?: number;
  tip?: number;
  notes?: string;
}

export interface FairShareParticipant {
  name: string;
  paypalEmail: string;
  shareAmount: number;
  paidStatus: 'unpaid' | 'paid' | 'pending';
  invoiceLink?: string;
}

export interface DisputeCase {
  id: string;
  merchant: string;
  amount: number;
  disputeReason: string;
  filedDate: string;
  winProbability: number;
  trackingNumber: string;
  carrier: string;
  deliveryStatus: string;
  customerClaim: string;
  rebuttalDraft: string;
  status: 'drafting' | 'submitted' | 'won' | 'lost';
}

export interface ProcurementPO {
  id: string;
  poNumber: string;
  vendor: string;
  invoiceAmount: number;
  poAmount: number;
  variancePercent: number;
  anomalyDetected: boolean;
  anomalyReason: string;
  status: 'flagged' | 'approved' | 'settled';
  lineItemsCount: number;
}

export interface CFOInvoice {
  id: string;
  invoiceNumber: string;
  client: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  status: 'on-time' | 'overdue' | 'collected';
  lastChased: string;
}
