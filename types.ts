export enum Currency {
  EGP = 'EGP',
  USD = 'USD',
  EUR = 'EUR',
  BANK_DEBT = 'Bank Debt',
  SH_ACCOUNT = 'SH Account'
}

export enum TransactionType {
  PAYABLE = 'Payable',
  RECEIVABLE = 'Receivable'
}

export enum PaymentType {
  CHEQUE = 'cheque',
  TRANSFER = 'transfer',
  CASH = 'cash'
}

export interface Transaction {
  id: string;
  originalDate: string; // YYYY-MM-DD for internal storage, display as DD/MM/YYYY
  partner: string;
  invoiceNo: string;
  type: TransactionType;
  amount: number;
  currency: Currency | string;
  paymentType: PaymentType | string;
  adjustedDate: string; // YYYY-MM-DD
  isLocked: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
}

export interface AccountBalances {
  [Currency.EGP]: number;
  [Currency.USD]: number;
  [Currency.EUR]: number;
  [Currency.BANK_DEBT]: number;
  [Currency.SH_ACCOUNT]: number;
}

export interface LedgerRow {
  date: string; // YYYY-MM-DD
  credit: number; // Receivables
  debit: number; // Payables
  net: number;
  balance: number;
}

// AI Optimization Types
export interface AIAdjustment {
  transactionId: string;
  suggestedDate: string; // YYYY-MM-DD
  reason: string;
}

export interface AINewTransaction {
  type: 'TRANSFER' | 'INJECTION';
  sourceAccount: string;
  targetAccount: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface AIOptimizationPlan {
  adjustments: AIAdjustment[];
  newTransactions: AINewTransaction[];
  summary: string;
}