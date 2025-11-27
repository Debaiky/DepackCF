import React from 'react';
import { LogEntry } from '../types';
import { Printer } from 'lucide-react';

export const AuditLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
        <html>
            <head>
                <title>Depack Audit Log</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    h1 { font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .log-entry { font-family: monospace; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
                    .timestamp { color: #555; font-weight: bold; margin-right: 10px; }
                    .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; }
                </style>
            </head>
            <body>
                <h1>Depack Cash Flow Planner - Audit Log</h1>
                ${logs.map(log => `
                    <div class="log-entry">
                        <span class="timestamp">[${log.timestamp.toLocaleString()}]</span>
                        ${log.message}
                    </div>
                `).join('')}
                <div class="footer">Generated on ${new Date().toLocaleString()}</div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-900 text-slate-300 rounded-lg p-4 h-48 overflow-hidden flex flex-col font-mono text-xs border border-slate-700 shadow-inner relative group">
      <div className="flex justify-between items-center mb-2 sticky top-0 bg-slate-900 pb-2 border-b border-slate-700">
          <h4 className="text-slate-100 font-bold">Audit Log</h4>
          <button 
            onClick={handlePrint} 
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Print Log to PDF"
          >
            <Printer size={14} />
          </button>
      </div>
      <div className="overflow-auto flex-1 flex flex-col-reverse gap-1">
        {logs.map((log) => (
          <div key={log.id} className="hover:text-white transition-colors">
            <span className="text-slate-500">[{log.timestamp.toLocaleTimeString()}]</span> {log.message}
          </div>
        ))}
        {logs.length === 0 && <div className="text-slate-600 italic">No activity recorded yet.</div>}
      </div>
    </div>
  );
};