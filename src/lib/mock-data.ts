import { AgentMandate, CFOInvoice, DisputeCase, EscalatedApproval, FairShareItem, FairShareParticipant, ProcurementPO, TransactionActivity } from '@/types';

// Clean initial states: zero preloaded mock values
export const INITIAL_MANDATES: AgentMandate[] = [];

export const INITIAL_TRANSACTIONS: TransactionActivity[] = [];

export const INITIAL_APPROVALS: EscalatedApproval[] = [];

export const SAMPLE_FAIRSHARE_RECEIPT = {
  restaurant: 'New Expense Group',
  date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  subtotal: 0.0,
  tax: 0.0,
  tip: 0.0,
  total: 0.0,
  items: [] as FairShareItem[],
  participants: [] as FairShareParticipant[],
};

export const SAMPLE_DISPUTES: DisputeCase[] = [];

export const SAMPLE_PROCUREMENT_POS: ProcurementPO[] = [];

export const SAMPLE_CFO_INVOICES: CFOInvoice[] = [];
