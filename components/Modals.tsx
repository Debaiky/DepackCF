import React, { useState, useEffect } from 'react';
import { Transaction, Currency, TransactionType, PaymentType, AIOptimizationPlan } from '../types';
import { generateId, formatDateInput, formatDateDisplay } from '../utils';
import { X, Plus, ArrowRight, Sparkles, Loader2, CheckCircle } from 'lucide-react';

// --- Base Modal ---
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }> = ({ title, onClose, children, maxWidth = "max-w-lg" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
      <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
      </div>
      <div className="p-6 overflow-auto">{children}</div>
    </div>
  </div>
);

// --- Delete Confirmation ---
export const ConfirmDeleteModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <Modal title="Confirm Deletion" onClose={onClose}>
      <p className="mb-6 text-slate-600">Are you sure you want to delete this transaction? This action cannot be undone.</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 bg-white text-slate-900">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
      </div>
    </Modal>
  );
};

// --- Add Transaction ---
export const AddTransactionModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onAdd: (t: Transaction) => void 
}> = ({ isOpen, onClose, onAdd }) => {
    const [form, setForm] = useState<Partial<Transaction>>({
        originalDate: formatDateInput(new Date()),
        partner: '',
        invoiceNo: '',
        type: TransactionType.PAYABLE,
        amount: 0,
        currency: Currency.EGP,
        paymentType: PaymentType.TRANSFER,
        adjustedDate: formatDateInput(new Date())
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            ...form as Transaction,
            id: generateId(),
            isLocked: false,
            // Ensure types match
            amount: Number(form.amount)
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal title="Add New Transaction" onClose={onClose}>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Original Date</span>
                    <input required type="date" className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.originalDate} onChange={e => setForm({...form, originalDate: e.target.value})} />
                </label>
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Adjusted Date</span>
                    <input required type="date" className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.adjustedDate} onChange={e => setForm({...form, adjustedDate: e.target.value})} />
                </label>
                <label className="block col-span-2">
                    <span className="text-xs font-bold text-slate-500">Partner</span>
                    <input required type="text" className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.partner} onChange={e => setForm({...form, partner: e.target.value})} />
                </label>
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Invoice No.</span>
                    <input required type="text" className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})} />
                </label>
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Amount</span>
                    <input required type="number" className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} />
                </label>
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Type</span>
                    <select className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.type} onChange={e => setForm({...form, type: e.target.value as TransactionType})}>
                        <option value={TransactionType.PAYABLE}>Payable</option>
                        <option value={TransactionType.RECEIVABLE}>Receivable</option>
                    </select>
                </label>
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Currency</span>
                    <select className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.currency} onChange={e => setForm({...form, currency: e.target.value as Currency})}>
                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </label>
                <label className="block col-span-1">
                    <span className="text-xs font-bold text-slate-500">Payment Type</span>
                    <select className="w-full border rounded p-2 mt-1 bg-white text-slate-900" 
                        value={form.paymentType} onChange={e => setForm({...form, paymentType: e.target.value})}>
                        {Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
                
                <div className="col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-slate-50 bg-white text-slate-900">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Add Transaction</button>
                </div>
            </form>
        </Modal>
    );
}

// --- Internal Transfer ---
export const InternalTransferModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (creditAcc: string, debitAcc: string, amount: number, rate: number, date: string) => void;
}> = ({ isOpen, onClose, onTransfer }) => {
    const [creditAcc, setCreditAcc] = useState<string>(Currency.USD);
    const [debitAcc, setDebitAcc] = useState<string>(Currency.EGP);
    const [amount, setAmount] = useState<number>(0);
    const [rate, setRate] = useState<number>(1);
    const [date, setDate] = useState<string>(formatDateInput(new Date()));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onTransfer(creditAcc, debitAcc, amount, rate, date);
        onClose();
    };

    if(!isOpen) return null;

    return (
        <Modal title="Make Internal Transfer" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                         <span className="text-xs font-bold text-slate-500 block mb-1">From (Debit Account)</span>
                         <select className="w-full border p-2 rounded bg-white text-slate-900" value={debitAcc} onChange={e => setDebitAcc(e.target.value)}>
                             {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <p className="text-xs text-slate-400 mt-1">Funds leave here</p>
                    </div>
                    <ArrowRight className="text-slate-400 mt-4" />
                    <div className="flex-1">
                         <span className="text-xs font-bold text-slate-500 block mb-1">To (Credited Account)</span>
                         <select className="w-full border p-2 rounded bg-white text-slate-900" value={creditAcc} onChange={e => setCreditAcc(e.target.value)}>
                             {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <p className="text-xs text-slate-400 mt-1">Funds enter here</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <label>
                        <span className="text-xs font-bold text-slate-500">Amount (in Credit Acc Currency)</span>
                        <input required type="number" min="0.01" step="0.01" className="w-full border rounded p-2 mt-1 bg-white text-slate-900"
                            value={amount} onChange={e => setAmount(Number(e.target.value))} />
                    </label>
                    <label>
                         <span className="text-xs font-bold text-slate-500">Exchange Rate</span>
                         <input required type="number" min="0.0001" step="0.0001" className="w-full border rounded p-2 mt-1 bg-white text-slate-900"
                             value={rate} onChange={e => setRate(Number(e.target.value))} />
                         <span className="text-xs text-slate-400">1 {creditAcc} = {rate} {debitAcc}</span>
                    </label>
                </div>
                 <label className="block">
                     <span className="text-xs font-bold text-slate-500">Transfer Date</span>
                     <input required type="date" className="w-full border rounded p-2 mt-1 bg-white text-slate-900"
                         value={date} onChange={e => setDate(e.target.value)} />
                 </label>

                 <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
                    <p>Summary:</p>
                    <ul className="list-disc pl-4 mt-1">
                        <li>Credit (Add to) <strong>{creditAcc}</strong>: {amount.toLocaleString()}</li>
                        <li>Debit (Deduct from) <strong>{debitAcc}</strong>: {(amount * rate).toLocaleString()}</li>
                    </ul>
                 </div>

                 <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-slate-50 bg-white text-slate-900">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirm Transfer</button>
                </div>
            </form>
        </Modal>
    );
};

// --- Split Transaction ---
export const SplitTransactionModal: React.FC<{
    transaction: Transaction | null;
    onClose: () => void;
    onConfirm: (splits: {amount: number, date: string}[]) => void;
}> = ({ transaction, onClose, onConfirm }) => {
    const [splits, setSplits] = useState<{amount: number, date: string}[]>([]);

    useEffect(() => {
        if (transaction) {
            setSplits([{ amount: transaction.amount, date: transaction.adjustedDate }]);
        }
    }, [transaction]);

    if (!transaction) return null;

    const totalAllocated = splits.reduce((sum, s) => sum + s.amount, 0);
    const remaining = transaction.amount - totalAllocated;

    const updateSplit = (index: number, field: 'amount' | 'date', value: string | number) => {
        const newSplits = [...splits];
        if (field === 'amount') {
            newSplits[index].amount = Number(value);
        } else {
            newSplits[index].date = String(value);
        }
        setSplits(newSplits);
    };

    const addSplit = () => {
        if (remaining > 0) {
            setSplits([...splits, { amount: remaining, date: transaction.adjustedDate }]);
        }
    };

    const removeSplit = (index: number) => {
        if (splits.length > 1) {
            setSplits(splits.filter((_, i) => i !== index));
        }
    };

    const isValid = Math.abs(remaining) < 0.01;

    return (
        <Modal title="Split Transaction" onClose={onClose}>
            <div className="mb-4 text-sm text-slate-600">
                <p><strong>Partner:</strong> {transaction.partner}</p>
                <p><strong>Total Amount:</strong> {transaction.amount.toLocaleString()} {transaction.currency}</p>
                <p><strong>Original Date:</strong> {formatDateInput(new Date(transaction.originalDate))}</p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-auto">
                {splits.map((split, idx) => (
                    <div key={idx} className="flex gap-2 items-end bg-slate-50 p-2 rounded">
                        <label className="flex-1">
                            <span className="text-xs font-bold text-slate-500">Amount</span>
                            <input 
                                type="number" 
                                className="w-full border rounded p-1 text-sm bg-white text-slate-900"
                                value={split.amount}
                                onChange={e => updateSplit(idx, 'amount', e.target.value)}
                            />
                        </label>
                        <label className="flex-1">
                            <span className="text-xs font-bold text-slate-500">Date</span>
                            <input 
                                type="date" 
                                className="w-full border rounded p-1 text-sm bg-white text-slate-900"
                                value={split.date}
                                onChange={e => updateSplit(idx, 'date', e.target.value)}
                            />
                        </label>
                        {splits.length > 1 && (
                            <button onClick={() => removeSplit(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4 flex justify-between items-center text-sm">
                 <button 
                    type="button" 
                    onClick={addSplit} 
                    disabled={remaining <= 0}
                    className="flex items-center gap-1 text-blue-600 font-medium disabled:opacity-50"
                 >
                     <Plus size={16} /> Add Split
                 </button>
                 <div className={`font-bold ${Math.abs(remaining) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                     Remaining: {remaining.toLocaleString()}
                 </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                 <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-slate-50 bg-white text-slate-900">Cancel</button>
                 <button 
                    onClick={() => onConfirm(splits)} 
                    disabled={!isValid}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                 >
                     Confirm Split
                 </button>
             </div>
        </Modal>
    );
};

// --- AI Compute Modal ---
export const AIComputeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCompute: (maxDays: number, rates: { eurUsd: number, usdEgp: number }) => Promise<AIOptimizationPlan | null>;
    onApply: (plan: AIOptimizationPlan, rates: { eurUsd: number, usdEgp: number }) => void;
}> = ({ isOpen, onClose, onCompute, onApply }) => {
    const [step, setStep] = useState<'config' | 'loading' | 'results'>('config');
    const [maxDays, setMaxDays] = useState(30);
    const [eurUsdRate, setEurUsdRate] = useState(1.08);
    const [usdEgpRate, setUsdEgpRate] = useState(48.50);
    const [plan, setPlan] = useState<AIOptimizationPlan | null>(null);

    // Reset when opening
    useEffect(() => {
        if(isOpen) {
            setStep('config');
            setPlan(null);
        }
    }, [isOpen]);

    const handleComputeClick = async () => {
        setStep('loading');
        const result = await onCompute(maxDays, { eurUsd: eurUsdRate, usdEgp: usdEgpRate });
        if (result) {
            setPlan(result);
            setStep('results');
        } else {
            setStep('config'); // Go back on error
        }
    };

    const handleApplyClick = () => {
        if (plan) {
            onApply(plan, { eurUsd: eurUsdRate, usdEgp: usdEgpRate });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal 
            title={step === 'results' ? "AI Optimization Plan" : "Compute Cash Flow with AI"} 
            onClose={onClose}
            maxWidth="max-w-3xl"
        >
            {step === 'config' && (
                <div className="space-y-6">
                    <p className="text-slate-600 text-sm">
                        Depack AI will analyze your cash flow to minimize negative balances by intelligently deferring payments and suggesting transfers.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="font-bold text-slate-700 text-sm">Max Deferred Payment (Days)</span>
                            <input 
                                type="number" 
                                min="0" max="180" 
                                className="w-full border rounded p-2 mt-2 bg-white text-slate-900"
                                value={maxDays}
                                onChange={(e) => setMaxDays(Number(e.target.value))}
                            />
                        </label>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="font-bold text-slate-700 text-sm">EUR / USD Rate</span>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="w-full border rounded p-2 mt-2 bg-white text-slate-900"
                                    value={eurUsdRate}
                                    onChange={(e) => setEurUsdRate(Number(e.target.value))}
                                />
                            </label>
                            <label className="block">
                                <span className="font-bold text-slate-700 text-sm">USD / EGP Rate</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full border rounded p-2 mt-2 bg-white text-slate-900"
                                    value={usdEgpRate}
                                    onChange={(e) => setUsdEgpRate(Number(e.target.value))}
                                />
                            </label>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-400">Payments will not be pushed beyond this limit. Transfers will use the provided rates.</p>

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-slate-50 bg-white text-slate-900">Cancel</button>
                        <button 
                            onClick={handleComputeClick} 
                            className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 font-medium"
                        >
                            <Sparkles size={16} /> Start Optimization
                        </button>
                    </div>
                </div>
            )}

            {step === 'loading' && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <h4 className="text-lg font-bold text-slate-800">Analyzing Cash Flow...</h4>
                    <p className="text-slate-500 mt-2">Optimizing payment dates and calculating transfers.</p>
                </div>
            )}

            {step === 'results' && plan && (
                <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                            <Sparkles size={16} /> AI Summary
                        </h4>
                        <p className="text-sm text-indigo-900 leading-relaxed">{plan.summary}</p>
                    </div>

                    {/* Adjustments Table */}
                    <div>
                        <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{plan.adjustments.length}</span>
                            Suggested Deferrals
                        </h5>
                        {plan.adjustments.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="p-2">Transaction ID</th>
                                            <th className="p-2">New Date</th>
                                            <th className="p-2">Reasoning</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {plan.adjustments.map((adj, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono text-xs text-slate-500 truncate max-w-[80px]">{adj.transactionId}</td>
                                                <td className="p-2 font-medium text-blue-600">{formatDateDisplay(adj.suggestedDate)}</td>
                                                <td className="p-2 text-slate-600 text-xs">{adj.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No payment deferrals suggested.</p>
                        )}
                    </div>

                    {/* New Transactions Table */}
                    <div>
                         <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{plan.newTransactions.length}</span>
                            Suggested Transfers & Injections
                        </h5>
                        {plan.newTransactions.length > 0 ? (
                             <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="p-2">Type</th>
                                            <th className="p-2">From -> To</th>
                                            <th className="p-2">Amount</th>
                                            <th className="p-2">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {plan.newTransactions.map((tx, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-bold text-xs uppercase">{tx.type}</td>
                                                <td className="p-2 text-xs">
                                                    <span className="font-semibold">{tx.sourceAccount}</span> <ArrowRight size={10} className="inline" /> <span className="font-semibold">{tx.targetAccount}</span>
                                                </td>
                                                <td className="p-2 font-mono">{tx.amount.toLocaleString()} {tx.currency}</td>
                                                <td className="p-2 text-xs">{formatDateDisplay(tx.date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No transfers or injections needed.</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-slate-50 bg-white text-slate-900">Cancel</button>
                        <button 
                            onClick={handleApplyClick} 
                            className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 font-medium shadow-md"
                        >
                            <CheckCircle size={16} /> Apply Plan
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}