import { Transaction, TransactionType, PaymentType, Currency } from './types';

// Format Date object to DD/MM/YYYY
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

// Format Date object to YYYY-MM-DD (Input value format)
export const formatDateInput = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
};

// Parse DD/MM/YYYY to YYYY-MM-DD
export const parseCSVDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  // DD/MM/YYYY -> YYYY-MM-DD
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export const parseNumber = (numStr: string | number): number => {
  if (typeof numStr === 'number') return numStr;
  return parseFloat(numStr.replace(/,/g, '')) || 0;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const calculateDaysDiff = (original: string, adjusted: string): number => {
  const d1 = new Date(original);
  const d2 = new Date(adjusted);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const parseCSVLine = (line: string): Partial<Transaction> | null => {
  // Simple CSV parser handling basic commas. 
  // Note: For production, a library like PapaParse is recommended, but we keep it dep-free here.
  const columns = line.split(',').map(c => c.trim());
  if (columns.length < 8) return null;

  // Expected: Original Date, Partner, Invoice no., Payable/Receivable, Amount, Currency, Payment Type, Adjusted Date
  return {
    originalDate: parseCSVDate(columns[0]),
    partner: columns[1],
    invoiceNo: columns[2],
    type: columns[3].toLowerCase().includes('payable') ? TransactionType.PAYABLE : TransactionType.RECEIVABLE,
    amount: parseNumber(columns[4]),
    currency: columns[5] as Currency,
    paymentType: columns[6] as PaymentType,
    adjustedDate: parseCSVDate(columns[7]),
    isLocked: false,
  };
};

export const exportTransactionsToCSV = (transactions: Transaction[]) => {
  // Headers matching the import format
  const headers = ['Original Date', 'Partner', 'Invoice No.', 'Payable/Receivable', 'Amount', 'Currency', 'Payment Type', 'Adjusted Date'];
  
  const rows = transactions.map(t => [
    formatDateDisplay(t.originalDate),
    `"${t.partner}"`, // Quote partner to handle potential commas
    t.invoiceNo,
    t.type,
    t.amount,
    t.currency,
    t.paymentType,
    formatDateDisplay(t.adjustedDate)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `depack_cashflow_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};