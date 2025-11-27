import React, { useState, useMemo } from 'react';
import { Transaction, LogEntry, AccountBalances, TransactionType, PaymentType, Currency, AIOptimizationPlan } from './types';
import { generateId, parseCSVLine, formatDateDisplay, exportTransactionsToCSV } from './utils';
import { INITIAL_BALANCES, MOCK_DATA } from './constants';
import { Logo } from './components/Logo';
import TransactionTable from './components/TransactionTable';
import LedgerView from './components/LedgerView';
import { AuditLog } from './components/AuditLog';
import { AddTransactionModal, ConfirmDeleteModal, InternalTransferModal, SplitTransactionModal, AIComputeModal } from './components/Modals';
import { UploadCloud, PlayCircle, Download, Sparkles } from 'lucide-react';
import { optimizeCashFlowPlan } from './services/geminiService';

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalances, setOpeningBalances] = useState<AccountBalances>(INITIAL_BALANCES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Modals state
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [isAIModalOpen, setAIModalOpen] = useState(false); // New AI Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [splitTarget, setSplitTarget] = useState<Transaction | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');

  // Ledger State lifted to App
  const [ledgerCurrency, setLedgerCurrency] = useState<Currency>(Currency.USD);
  const [ledgerDateFilter, setLedgerDateFilter] = useState<string | null>(null);

  const addLog = (message: string) => {
    const newLog: LogEntry = {
      id: generateId(),
      timestamp: new Date(),
      message
    };
    setLogs(prev => [...prev, newLog]);
  };

  // --- Actions ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCsvContent(evt.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleCompute = () => {
    // Parse CSV
    const lines = csvContent.split('\n');
    const newTransactions: Transaction[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    
    lines.forEach((line, idx) => {
      const parsed = parseCSVLine(line);
      if (parsed) {
        // Logic: If adjusted date is prior to today, set it to today.
        let finalAdjustedDate = parsed.adjustedDate || todayStr;
        if (finalAdjustedDate < todayStr) {
            finalAdjustedDate = todayStr;
        }

        newTransactions.push({
          ...parsed,
          adjustedDate: finalAdjustedDate,
          id: generateId(),
        } as Transaction);
      }
    });
    
    setTransactions(newTransactions);
    setView('dashboard');
    addLog(`Uploaded CSV with ${newTransactions.length} transactions.`);
    addLog(`Transactions prior to ${todayStr} were auto-adjusted to today.`);
    addLog(`Initial Balances set: EGP ${openingBalances.EGP}, USD ${openingBalances.USD}, EUR ${openingBalances.EUR}`);
  };

  const updateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === updated.id) {
        // Detect changes for log
        if (t.adjustedDate !== updated.adjustedDate) {
          const diff = Math.ceil((new Date(updated.adjustedDate).getTime() - new Date(t.originalDate).getTime()) / (1000 * 60 * 60 * 24));
          addLog(`Changed payment date of "${t.partner}" to ${updated.adjustedDate} (${diff} days later).`);
        }
        return updated;
      }
      return t;
    }));
  };

  const deleteTransaction = () => {
    if (deleteTargetId) {
      const t = transactions.find(t => t.id === deleteTargetId);
      setTransactions(prev => prev.filter(t => t.id !== deleteTargetId));
      addLog(`Deleted transaction: ${t?.partner} - ${t?.amount} ${t?.currency}`);
      setDeleteTargetId(null);
    }
  };

  const splitTransaction = (splits: { amount: number; date: string }[]) => {
    if (!splitTarget) return;
    
    // Remove original, add new split transactions
    setTransactions(prev => {
        const filtered = prev.filter(t => t.id !== splitTarget.id);
        const newSplits = splits.map((s, idx) => ({
            ...splitTarget,
            id: generateId(),
            amount: s.amount,
            adjustedDate: s.date,
            isLocked: false, 
            invoiceNo: `${splitTarget.invoiceNo}-S${idx+1}` // Append suffix to track splits
        }));
        return [...filtered, ...newSplits];
    });
    
    addLog(`Split transaction for ${splitTarget.partner} (${splitTarget.amount} ${splitTarget.currency}) into ${splits.length} parts.`);
    setSplitTarget(null);
  };

  const internalTransfer = (creditAcc: string, debitAcc: string, amount: number, rate: number, date: string) => {
      // 1. Credit Transaction (Receivable for Destination)
      const creditTx: Transaction = {
          id: generateId(),
          originalDate: date,
          adjustedDate: date,
          partner: debitAcc, // From the debit account
          invoiceNo: 'INT-TRANSFER',
          type: TransactionType.RECEIVABLE,
          amount: amount,
          currency: creditAcc,
          paymentType: PaymentType.TRANSFER,
          isLocked: true
      };

      // 2. Debit Transaction (Payable for Source)
      const debitTx: Transaction = {
          id: generateId(),
          originalDate: date,
          adjustedDate: date,
          partner: creditAcc, // To the credit account
          invoiceNo: 'INT-TRANSFER',
          type: TransactionType.PAYABLE,
          amount: amount * rate, // Converted amount
          currency: debitAcc,
          paymentType: PaymentType.TRANSFER,
          isLocked: true
      };

      setTransactions(prev => [...prev, creditTx, debitTx]);
      addLog(`Internal Transfer: ${amount} ${creditAcc} to ${debitAcc} (Rate: ${rate}). Created 2 transactions.`);
  };

  const addTransaction = (t: Transaction) => {
      setTransactions(prev => [...prev, t]);
      addLog(`Manually added transaction: ${t.partner}, ${t.amount} ${t.currency}`);
  };

  // --- AI Optimization Handlers ---
  const handleAICompute = async (maxDays: number, rates: { eurUsd: number, usdEgp: number }) => {
      try {
          return await optimizeCashFlowPlan(transactions, openingBalances, maxDays, rates);
      } catch (error) {
          alert("AI Error: " + error);
          return null;
      }
  };

  const handleAIApply = (plan: AIOptimizationPlan, rates: { eurUsd: number, usdEgp: number }) => {
      // 1. Apply Adjustments
      setTransactions(prev => {
          let updated = [...prev];
          
          // Apply Deferrals
          plan.adjustments.forEach(adj => {
              const idx = updated.findIndex(t => t.id === adj.transactionId);
              if (idx !== -1) {
                  updated[idx] = { ...updated[idx], adjustedDate: adj.suggestedDate };
              }
          });

          // Apply New Transactions (Transfers/Injections)
          plan.newTransactions.forEach(tx => {
              
              if (tx.type === 'TRANSFER') {
                  // Calculate Converted Amount for the Target Account
                  let targetAmount = tx.amount;
                  const s = tx.currency as Currency; // Source Currency
                  const t = tx.targetAccount as Currency; // Target Currency
                  
                  // Helper for conversion
                  // Base rates: EUR/USD, USD/EGP
                  // EUR = eurUsd * USD
                  // USD = usdEgp * EGP
                  
                  // Convert Source to USD first
                  let amountInUSD = 0;
                  if (s === Currency.USD) amountInUSD = tx.amount;
                  else if (s === Currency.EUR) amountInUSD = tx.amount * rates.eurUsd;
                  else if (s === Currency.EGP) amountInUSD = tx.amount / rates.usdEgp;
                  
                  // Convert USD to Target
                  if (t === Currency.USD) targetAmount = amountInUSD;
                  else if (t === Currency.EUR) targetAmount = amountInUSD / rates.eurUsd;
                  else if (t === Currency.EGP) targetAmount = amountInUSD * rates.usdEgp;
                  
                  // Round to 2 decimals
                  targetAmount = Math.round(targetAmount * 100) / 100;

                  // 1. Withdrawal from Source (Payable)
                  updated.push({
                      id: generateId(),
                      originalDate: tx.date,
                      adjustedDate: tx.date,
                      partner: `Transfer to ${tx.targetAccount}`,
                      invoiceNo: 'AI-TRF-OUT',
                      type: TransactionType.PAYABLE,
                      amount: tx.amount,
                      currency: tx.sourceAccount,
                      paymentType: PaymentType.TRANSFER,
                      isLocked: true
                  });
                  
                  // 2. Deposit to Target (Receivable)
                  updated.push({
                      id: generateId(),
                      originalDate: tx.date,
                      adjustedDate: tx.date,
                      partner: `Transfer from ${tx.sourceAccount}`,
                      invoiceNo: 'AI-TRF-IN',
                      type: TransactionType.RECEIVABLE,
                      amount: targetAmount, 
                      currency: tx.targetAccount,
                      paymentType: PaymentType.TRANSFER,
                      isLocked: true
                  });

                  addLog(`AI Transfer: ${tx.amount} ${tx.sourceAccount} -> ${targetAmount} ${tx.targetAccount}`);

              } else if (tx.type === 'INJECTION') {
                  // Receive funds
                  updated.push({
                      id: generateId(),
                      originalDate: tx.date,
                      adjustedDate: tx.date,
                      partner: tx.sourceAccount, // Bank or SH
                      invoiceNo: 'AI-INJECT',
                      type: TransactionType.RECEIVABLE,
                      amount: tx.amount,
                      currency: tx.currency,
                      paymentType: PaymentType.TRANSFER,
                      isLocked: true
                  });
                  addLog(`AI Injection: ${tx.amount} ${tx.currency} from ${tx.sourceAccount}`);
              }
          });

          return updated;
      });

      addLog(`Applied AI Optimization Plan: ${plan.adjustments.length} deferrals, ${plan.newTransactions.length} new transactions.`);
  };
  
  // Filter transactions passed to the table based on Ledger selection
  // If a ledger date is selected, we filter by that date AND the current ledger currency
  const visibleTransactions = useMemo(() => {
    let filtered = transactions;
    if (ledgerDateFilter) {
      filtered = filtered.filter(t => t.adjustedDate === ledgerDateFilter && t.currency === ledgerCurrency);
    }
    return filtered;
  }, [transactions, ledgerDateFilter, ledgerCurrency]);


  // --- Views ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
               <Logo className="text-4xl" />
            </div>
            <h1 className="text-2xl font-light text-slate-600">Cash Flow AI Planner</h1>
            <p className="text-slate-400 mt-2">Upload your financial data to begin analysis</p>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
              <UploadCloud className="mx-auto text-slate-400 mb-4" size={48} />
              <label className="cursor-pointer">
                <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Choose CSV File</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              {csvContent && <p className="mt-4 text-green-600 font-medium">File loaded successfully!</p>}
              <button onClick={() => setCsvContent(MOCK_DATA)} className="block mx-auto mt-4 text-xs text-slate-400 underline">Use Mock Data</button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[Currency.EGP, Currency.USD, Currency.EUR].map(curr => (
                <label key={curr} className="block">
                  <span className="text-xs font-bold text-slate-500 block mb-1">{curr} Opening Balance</span>
                  <input 
                    type="number" 
                    className="w-full border rounded-lg p-2.5 bg-slate-50 focus:bg-white transition"
                    value={openingBalances[curr]}
                    onChange={(e) => setOpeningBalances({...openingBalances, [curr]: Number(e.target.value)})}
                  />
                </label>
              ))}
            </div>

            <button 
              onClick={handleCompute}
              disabled={!csvContent}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              <PlayCircle /> Compute Cash Flow
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-20">
        <Logo />
        <div className="flex gap-3">
          <button 
             onClick={() => setAIModalOpen(true)}
             className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 border border-indigo-700 rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 animate-pulse"
          >
             <Sparkles size={16} /> Compute using AI
          </button>
          <div className="w-px bg-slate-300 mx-1"></div>
          <button
            onClick={() => exportTransactionsToCSV(transactions)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={() => setTransferModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Make Internal Transfer
          </button>
          <button 
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            + Add Transaction
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Transaction Table */}
        <div className="w-2/3 flex flex-col">
            <div className="mb-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-700">Transactions</h2>
                {ledgerDateFilter && (
                    <button onClick={() => setLedgerDateFilter(null)} className="text-xs text-red-500 hover:underline bg-red-50 px-2 py-1 rounded">
                        Clear Ledger Filter: {formatDateDisplay(ledgerDateFilter)} ({ledgerCurrency})
                    </button>
                )}
            </div>
            <TransactionTable 
                transactions={visibleTransactions}
                onUpdateTransaction={updateTransaction}
                onDeleteTransaction={(id) => setDeleteTargetId(id)}
                onSplitTransaction={(t) => setSplitTarget(t)}
                onFilterDate={() => {}} 
            />
        </div>

        {/* Right: Ledger */}
        <div className="w-1/3 min-w-[350px]">
          <LedgerView 
            transactions={transactions} 
            openingBalances={openingBalances}
            selectedCurrency={ledgerCurrency}
            onCurrencyChange={setLedgerCurrency}
            selectedDate={ledgerDateFilter}
            onFilterByDate={setLedgerDateFilter}
          />
        </div>
      </div>

      {/* Bottom: Logs */}
      <div className="px-4 pb-4 h-52 shrink-0">
        <AuditLog logs={logs} />
      </div>

      {/* Modals */}
      <ConfirmDeleteModal 
        isOpen={!!deleteTargetId} 
        onClose={() => setDeleteTargetId(null)} 
        onConfirm={deleteTransaction} 
      />
      
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addTransaction}
      />

      <InternalTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onTransfer={internalTransfer}
      />

      <SplitTransactionModal 
        transaction={splitTarget}
        onClose={() => setSplitTarget(null)}
        onConfirm={splitTransaction}
      />

      <AIComputeModal
        isOpen={isAIModalOpen}
        onClose={() => setAIModalOpen(false)}
        onCompute={handleAICompute}
        onApply={handleAIApply}
      />
    </div>
  );
}