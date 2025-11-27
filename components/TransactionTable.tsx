import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatDateDisplay, formatDateInput, calculateDaysDiff } from '../utils';
import { Lock, Unlock, Trash2, Split, ArrowUpDown, Filter, Calendar, Check, X } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSplitTransaction: (t: Transaction) => void;
  onFilterDate: (start: string | null, end: string | null) => void;
}

type DateFilterState = {
    type: 'specific' | 'range';
    specificDates: string[]; // YYYY-MM-DD
    range: { start: string; end: string };
};

const DateFilterPopup: React.FC<{
    allValues: string[];
    currentFilter: DateFilterState | null;
    onApply: (filter: DateFilterState | null) => void;
    onClose: () => void;
}> = ({ allValues, currentFilter, onApply, onClose }) => {
    const [type, setType] = useState<'specific' | 'range'>(currentFilter?.type || 'specific');
    const [selectedDates, setSelectedDates] = useState<string[]>(currentFilter?.specificDates || []);
    const [range, setRange] = useState<{start: string, end: string}>(currentFilter?.range || {start: '', end: ''});

    // Unique sorted dates
    const uniqueDates = useMemo(() => Array.from(new Set(allValues)).sort(), [allValues]);

    const toggleDate = (date: string) => {
        setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    };

    const handleApply = () => {
        if (type === 'specific') {
            onApply(selectedDates.length > 0 ? { type: 'specific', specificDates: selectedDates, range: {start: '', end: ''} } : null);
        } else {
            if (range.start || range.end) {
                onApply({ type: 'range', range, specificDates: [] });
            } else {
                onApply(null);
            }
        }
        onClose();
    };

    return (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-3">
             <div className="flex bg-slate-100 rounded p-1 mb-3 text-xs">
                 <button 
                    className={`flex-1 py-1 rounded ${type === 'specific' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500'}`}
                    onClick={() => setType('specific')}
                 >
                     Specific Days
                 </button>
                 <button 
                    className={`flex-1 py-1 rounded ${type === 'range' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500'}`}
                    onClick={() => setType('range')}
                 >
                     Date Range
                 </button>
             </div>

             {type === 'specific' ? (
                 <div className="max-h-48 overflow-auto border rounded mb-3">
                     {uniqueDates.map(date => (
                         <label key={date} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-xs border-b last:border-0">
                             <input 
                                type="checkbox" 
                                checked={selectedDates.includes(date)} 
                                onChange={() => toggleDate(date)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                             />
                             {formatDateDisplay(date)}
                         </label>
                     ))}
                 </div>
             ) : (
                 <div className="space-y-2 mb-3">
                     <label className="block text-xs">
                         <span className="text-slate-500 font-bold">From</span>
                         <input 
                            type="date" 
                            className="w-full border rounded p-1 mt-1 bg-white text-slate-900"
                            value={range.start}
                            onChange={e => setRange({...range, start: e.target.value})}
                         />
                     </label>
                     <label className="block text-xs">
                         <span className="text-slate-500 font-bold">To</span>
                         <input 
                            type="date" 
                            className="w-full border rounded p-1 mt-1 bg-white text-slate-900"
                            value={range.end}
                            onChange={e => setRange({...range, end: e.target.value})}
                         />
                     </label>
                 </div>
             )}

             <div className="flex justify-between gap-2">
                 <button onClick={() => { onApply(null); onClose(); }} className="text-xs text-red-500 hover:text-red-700">Clear</button>
                 <button onClick={handleApply} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Apply Filter</button>
             </div>
        </div>
    );
};

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction,
  onSplitTransaction,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null);
  
  // Basic text filters
  const [textFilters, setTextFilters] = useState<Partial<Record<keyof Transaction, string>>>({});
  
  // Advanced Date filters
  const [dateFilters, setDateFilters] = useState<{
      originalDate: DateFilterState | null,
      adjustedDate: DateFilterState | null
  }>({ originalDate: null, adjustedDate: null });

  const [activeDateFilterPopup, setActiveDateFilterPopup] = useState<'originalDate' | 'adjustedDate' | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Column Resizing State
  const [colWidths, setColWidths] = useState<Record<string, number>>({
      originalDate: 100,
      partner: 150,
      invoiceNo: 100,
      type: 80,
      amount: 100,
      currency: 60,
      paymentType: 100,
      adjustedDate: 140,
      defDays: 80,
      isLocked: 60,
      actions: 80
  });
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setActiveDateFilterPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingCol) return;
        const diff = e.clientX - startX.current;
        setColWidths(prev => ({
            ...prev,
            [resizingCol]: Math.max(50, startWidth.current + diff)
        }));
    };

    const handleMouseUp = () => {
        setResizingCol(null);
    };

    if (resizingCol) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [resizingCol]);

  const startResizing = (e: React.MouseEvent, key: string) => {
      e.preventDefault();
      setResizingCol(key);
      startX.current = e.clientX;
      startWidth.current = colWidths[key];
  };

  // Sorting
  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  // Filtering logic
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter(t => {
        // 1. Text Filters
      for (const key in textFilters) {
        const k = key as keyof Transaction;
        if (textFilters[k] && !String(t[k]).toLowerCase().includes(textFilters[k]!.toLowerCase())) {
          return false;
        }
      }
      
      // 2. Date Filters
      const checkDateFilter = (val: string, filter: DateFilterState | null) => {
          if (!filter) return true;
          if (filter.type === 'specific') {
              return filter.specificDates.includes(val);
          } else {
              const d = new Date(val);
              const start = filter.range.start ? new Date(filter.range.start) : new Date('1900-01-01');
              const end = filter.range.end ? new Date(filter.range.end) : new Date('2100-01-01');
              return d >= start && d <= end;
          }
      };

      if (!checkDateFilter(t.originalDate, dateFilters.originalDate)) return false;
      if (!checkDateFilter(t.adjustedDate, dateFilters.adjustedDate)) return false;

      return true;
    });
  }, [sortedTransactions, textFilters, dateFilters]);

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleTextFilterChange = (key: keyof Transaction, value: string) => {
    setTextFilters(prev => ({ ...prev, [key]: value }));
  };

  const renderHeader = (col: { label: string, key: keyof Transaction | 'defDays' | 'actions' }) => {
    const width = colWidths[col.key] || 100;
    
    return (
        <th 
            key={col.key} 
            className="relative px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider align-top bg-slate-50 border-r border-slate-200"
            style={{ width: width }}
        >
            <div className="flex flex-col gap-1 w-full overflow-hidden">
                {/* Header Top Row */}
                <div className="flex items-center justify-between">
                     <div 
                      className={`flex items-center gap-1 cursor-pointer hover:text-slate-700 truncate ${col.key === 'actions' || col.key === 'defDays' ? '' : ''}`}
                      onClick={() => col.key !== 'actions' && col.key !== 'defDays' && requestSort(col.key as keyof Transaction)}
                    >
                      {col.label} 
                      {col.key !== 'actions' && col.key !== 'defDays' && <ArrowUpDown size={12} />}
                    </div>

                    {/* Filter Icon for Dates */}
                    {(col.key === 'originalDate' || col.key === 'adjustedDate') && (
                        <div className="relative" ref={activeDateFilterPopup === col.key ? popupRef : null}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveDateFilterPopup(activeDateFilterPopup === col.key ? null : col.key as any); }}
                                className={`p-1 rounded ${dateFilters[col.key] ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Filter size={14} />
                            </button>
                            {activeDateFilterPopup === col.key && (
                                <DateFilterPopup 
                                    allValues={transactions.map(t => t[col.key as keyof Transaction] as string)}
                                    currentFilter={dateFilters[col.key]}
                                    onClose={() => setActiveDateFilterPopup(null)}
                                    onApply={(f) => setDateFilters(prev => ({...prev, [col.key as string]: f}))}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Filter Inputs (Text) */}
                {col.key !== 'actions' && col.key !== 'defDays' && col.key !== 'isLocked' && col.key !== 'originalDate' && col.key !== 'adjustedDate' && (
                    <input
                        type="text"
                        className="w-full text-xs p-1 border rounded bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Filter..."
                        onChange={(e) => handleTextFilterChange(col.key as keyof Transaction, e.target.value)}
                    />
                )}
                
                {/* Spacer for alignment if no input */}
                {(col.key === 'actions' || col.key === 'isLocked' || col.key === 'defDays' || col.key === 'originalDate' || col.key === 'adjustedDate') && (
                     <div className="h-[26px] flex items-center">
                         {(col.key === 'originalDate' || col.key === 'adjustedDate') && dateFilters[col.key] && (
                             <div className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded truncate w-full">
                                {dateFilters[col.key]?.type === 'specific' 
                                    ? `${dateFilters[col.key]?.specificDates.length} days` 
                                    : 'Range Active'}
                             </div>
                         )}
                     </div>
                )}
            </div>

            {/* Resizer Handle */}
            <div 
                className="absolute right-0 top-0 bottom-0 w-1 hover:bg-blue-400 cursor-col-resize z-20 group"
                onMouseDown={(e) => startResizing(e, col.key)}
            >
                <div className="h-full w-[1px] bg-slate-200 group-hover:bg-blue-400 ml-auto"></div>
            </div>
        </th>
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg shadow border border-slate-200 h-full">
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-slate-200 table-fixed">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {[
                { label: 'Orig Date', key: 'originalDate' },
                { label: 'Partner', key: 'partner' },
                { label: 'Inv No.', key: 'invoiceNo' },
                { label: 'Type', key: 'type' },
                { label: 'Amount', key: 'amount' },
                { label: 'Cur', key: 'currency' },
                { label: 'Method', key: 'paymentType' },
                { label: 'Adj Date', key: 'adjustedDate' },
                { label: 'Def. Days', key: 'defDays' },
                { label: 'Lock', key: 'isLocked' },
                { label: 'Actions', key: 'actions' },
              ].map((col) => renderHeader(col as any))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredTransactions.map((t) => {
               const defDays = calculateDaysDiff(t.originalDate, t.adjustedDate);
               const isNegative = t.type === TransactionType.PAYABLE;
               
               return (
              <tr key={t.id} className="hover:bg-slate-50 text-sm">
                <td className="px-3 py-2 whitespace-nowrap truncate overflow-hidden" title={formatDateDisplay(t.originalDate)}>{formatDateDisplay(t.originalDate)}</td>
                <td className="px-3 py-2 whitespace-nowrap truncate overflow-hidden" title={t.partner}>{t.partner}</td>
                <td className="px-3 py-2 whitespace-nowrap truncate overflow-hidden" title={t.invoiceNo}>{t.invoiceNo}</td>
                <td className={`px-3 py-2 whitespace-nowrap font-medium truncate overflow-hidden ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                  {t.type}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-mono truncate overflow-hidden">
                  {t.amount.toLocaleString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap truncate overflow-hidden">{t.currency}</td>
                <td className="px-3 py-2 whitespace-nowrap truncate overflow-hidden">{t.paymentType}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.isLocked ? (
                    <span className="text-slate-500">{formatDateDisplay(t.adjustedDate)}</span>
                  ) : (
                    <input
                      type="date"
                      value={t.adjustedDate}
                      onChange={(e) => onUpdateTransaction({ ...t, adjustedDate: e.target.value })}
                      className="border rounded px-1 py-0.5 text-xs w-full bg-white text-slate-900"
                    />
                  )}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap font-bold ${defDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {defDays}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <button
                    onClick={() => onUpdateTransaction({ ...t, isLocked: !t.isLocked })}
                    className={`p-1 rounded hover:bg-slate-100 ${t.isLocked ? 'text-red-500' : 'text-slate-400'}`}
                  >
                    {t.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => !t.isLocked && onSplitTransaction(t)}
                      disabled={t.isLocked}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-30"
                      title="Split Transaction"
                    >
                      <Split size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-slate-400">No transactions found matching your filters.</div>
        )}
      </div>
    </div>
  );
};

export default TransactionTable;