import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, LedgerRow, Currency, TransactionType, AccountBalances } from '../types';
import { formatDateDisplay } from '../utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzeCashFlow } from '../services/geminiService';
import { Sparkles, Loader2 } from 'lucide-react';

interface LedgerViewProps {
  transactions: Transaction[];
  openingBalances: AccountBalances;
  selectedCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  selectedDate: string | null;
  onFilterByDate: (date: string | null) => void;
}

const LedgerView: React.FC<LedgerViewProps> = ({ 
  transactions, 
  openingBalances, 
  selectedCurrency,
  onCurrencyChange,
  selectedDate,
  onFilterByDate 
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const ledgerData = useMemo(() => {
    const data: LedgerRow[] = [];
    const today = new Date();
    today.setHours(0,0,0,0); // Normalizing

    let runningBalance = openingBalances[selectedCurrency] || 0;

    // Generate 90 days
    for (let i = 0; i <= 90; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Filter transactions for this day, currency, and adj date
      const daysTx = transactions.filter(t => 
        t.currency === selectedCurrency && 
        t.adjustedDate === dateStr
      );

      const credits = daysTx
        .filter(t => t.type === TransactionType.RECEIVABLE)
        .reduce((sum, t) => sum + t.amount, 0);

      const debits = daysTx
        .filter(t => t.type === TransactionType.PAYABLE)
        .reduce((sum, t) => sum + t.amount, 0);

      const net = credits - debits;
      runningBalance += net;

      data.push({
        date: dateStr,
        credit: credits,
        debit: debits,
        net,
        balance: runningBalance
      });
    }
    return data;
  }, [transactions, openingBalances, selectedCurrency]);

  const handleRowClick = (date: string) => {
    if (selectedDate === date) {
        onFilterByDate(null);
    } else {
        onFilterByDate(date);
    }
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    setAiAnalysis('');
    const result = await analyzeCashFlow(ledgerData, selectedCurrency);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // Reset analysis when currency changes
  useEffect(() => {
    setAiAnalysis('');
  }, [selectedCurrency]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Account Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.values(Currency).map(curr => (
          <button
            key={curr}
            onClick={() => onCurrencyChange(curr)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCurrency === curr 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            {curr}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48 bg-white rounded-lg border border-slate-200 p-4 shadow-sm relative">
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Projected Balance (90 Days)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={ledgerData}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="date" 
                tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth()+1}`;
                }} 
                tick={{fontSize: 10}} 
                interval={14}
            />
            <YAxis tick={{fontSize: 10}} width={40} />
            <Tooltip 
                labelFormatter={(val) => formatDateDisplay(val as string)}
                formatter={(val: number) => val.toLocaleString()}
            />
            <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#2563eb" 
                fillOpacity={1} 
                fill="url(#colorBalance)" 
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* AI Button Overlay */}
        <div className="absolute top-4 right-4 z-10">
           <button 
             onClick={handleAIAnalyze}
             disabled={isAnalyzing}
             className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors"
           >
             {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
             AI Analyze
           </button>
        </div>
      </div>
      
      {/* AI Analysis Result Box */}
      {aiAnalysis && (
        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-sm text-indigo-900 animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold flex items-center gap-2 text-indigo-700 mb-1">
                <Sparkles size={14} /> AI Insight
            </h4>
            <p className="leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
        </div>
      )}

      {/* Ledger Table */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-sm">
          {selectedCurrency} Ledger
        </div>
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-2 text-right font-medium text-green-600">Credit (In)</th>
                <th className="px-4 py-2 text-right font-medium text-red-600">Debit (Out)</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Net</th>
                <th className="px-4 py-2 text-right font-medium text-slate-800">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerData.map((row) => (
                <tr 
                    key={row.date} 
                    onClick={() => handleRowClick(row.date)}
                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedDate === row.date ? 'bg-blue-100' : ''}`}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDateDisplay(row.date)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-right text-red-600">{row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-right font-medium">{row.net !== 0 ? row.net.toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-700">{row.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LedgerView;