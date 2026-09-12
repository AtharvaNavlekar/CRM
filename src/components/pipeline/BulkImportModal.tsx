import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { Lead } from '../../types';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: Partial<Lead>[]) => Promise<void>;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column mapping states
  const [nameCol, setNameCol] = useState('name');
  const [phoneCol, setPhoneCol] = useState('phone');
  const [sourceCol, setSourceCol] = useState('source');
  const [notesCol, setNotesCol] = useState('notes');
  const [valueCol, setValueCol] = useState('value');

  const modalRef = useModalFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const sampleCsv = `name,phone,source,notes,value,industry
Abhishek Saxena,+91 98765 43210,IndiaMART,Interested in 50L SME loan for manufacturing machinery,5000000,Lending
Kavita Raman,+91 98111 22334,WhatsApp,Wants MBA executive weekend batch fee schedule,250000,Education
Manish Choudhary,+91 99222 33445,Website,Looking for ready-to-move 2BHK in Bangalore East,7500000,Real Estate
Bhavna Mehra,+91 98444 55667,Google Ads,Health insurance plan for senior citizen parents,65000,Insurance`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'telecrm_sample_leads_india.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSample = () => {
    setCsvText(sampleCsv);
    parseCsv(sampleCsv);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    setError('');
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      setError('CSV must contain at least a header row and 1 data row.');
      return;
    }

    const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    setHeaders(rawHeaders);

    // Auto-detect mappings
    const lowerHeaders = rawHeaders.map(h => h.toLowerCase());
    const findMatch = (keys: string[]) => {
      const idx = lowerHeaders.findIndex(h => keys.some(k => h.includes(k)));
      return idx !== -1 ? rawHeaders[idx] : rawHeaders[0];
    };

    setNameCol(findMatch(['name', 'lead', 'customer', 'contact']));
    setPhoneCol(findMatch(['phone', 'mobile', 'tel', 'whatsapp', 'number']));
    setSourceCol(findMatch(['source', 'channel', 'origin', 'platform']));
    setNotesCol(findMatch(['note', 'remark', 'requirement', 'desc']));
    setValueCol(findMatch(['val', 'amount', 'budget', 'price']));

    // Parse up to 10 preview rows
    const rows = lines.slice(1, 6).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const rowObj: any = {};
      rawHeaders.forEach((h, i) => {
        rowObj[h] = values[i] || '';
      });
      return rowObj;
    });

    setPreviewRows(rows);
  };

  const handleExecuteImport = async () => {
    if (!csvText) {
      setError('Please upload or paste CSV data first');
      return;
    }

    const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      setError('CSV requires at least 1 lead row');
      return;
    }

    const fileHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const nameIdx = fileHeaders.indexOf(nameCol);
    const phoneIdx = fileHeaders.indexOf(phoneCol);
    const sourceIdx = fileHeaders.indexOf(sourceCol);
    const notesIdx = fileHeaders.indexOf(notesCol);
    const valueIdx = fileHeaders.indexOf(valueCol);

    const leadsToImport: Partial<Lead>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const name = nameIdx !== -1 ? cols[nameIdx] : `Lead #${i}`;
      const phone = phoneIdx !== -1 ? cols[phoneIdx] : '';
      const source = sourceIdx !== -1 ? cols[sourceIdx] : 'Manual';
      const notes = notesIdx !== -1 ? cols[notesIdx] : '';
      const value = valueIdx !== -1 ? Number(cols[valueIdx]) || 500000 : 500000;

      if (name || phone) {
        leadsToImport.push({
          name: name || 'Unnamed Contact',
          phone: phone || '+91 98000 00000',
          source: (['Website', 'WhatsApp', 'Facebook', 'Google Ads', 'IndiaMART', 'Manual'].includes(source)
            ? source
            : 'Manual') as any,
          notes: notes || 'Imported via CSV',
          value
        });
      }
    }

    if (leadsToImport.length === 0) {
      setError('No valid lead rows found in CSV');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      await onImport(leadsToImport);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        id="modal-bulk-import"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-bulk-import-title"
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] outline-none"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1F3A5F] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2E6E5C] flex items-center justify-center text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-bulk-import-title" className="text-base font-bold">Bulk CSV Lead Importer</h2>
              <p className="text-xs text-slate-300">Map columns and import hundreds of Indian SMB prospects</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bulk import dialog"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Quick sample buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/60">
            <div className="text-xs text-teal-900 dark:text-teal-200">
              <span className="font-bold">Need a template?</span> We have prepared a sample Indian SMB leads sheet.
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/50"
              >
                Load Sample Data
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#2E6E5C] text-white hover:bg-[#255e4e] flex items-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Download .CSV</span>
              </button>
            </div>
          </div>

          {/* File Upload & Paste input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Upload CSV File or Paste Raw CSV Text
            </label>
            <div className="flex items-center space-x-3 mb-2">
              <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center space-x-2">
                <Upload className="w-4 h-4 text-teal-600" />
                <span>Choose .CSV File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-400">or paste directly below:</span>
            </div>

            <textarea
              rows={4}
              id="textarea-csv-data"
              placeholder="name,phone,source,notes,value&#10;Vikram Malhotra,+91 98201 12345,IndiaMART,Gurgaon 3BHK query,25000000"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                if (e.target.value.includes('\n')) {
                  parseCsv(e.target.value);
                }
              }}
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
            />
          </div>

          {/* Column Mapping Selectors */}
          {headers.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Map CSV Columns to Lead Fields
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer Name *
                  </label>
                  <select
                    value={nameCol}
                    onChange={(e) => setNameCol(e.target.value)}
                    className="w-full p-1.5 text-xs text-slate-800 dark:text-slate-200 m3-select"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Phone / Mobile *
                  </label>
                  <select
                    value={phoneCol}
                    onChange={(e) => setPhoneCol(e.target.value)}
                    className="w-full p-1.5 text-xs text-slate-800 dark:text-slate-200 m3-select"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={sourceCol}
                    onChange={(e) => setSourceCol(e.target.value)}
                    className="w-full p-1.5 text-xs text-slate-800 dark:text-slate-200 m3-select"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Notes / Requirements
                  </label>
                  <select
                    value={notesCol}
                    onChange={(e) => setNotesCol(e.target.value)}
                    className="w-full p-1.5 text-xs text-slate-800 dark:text-slate-200 m3-select"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Deal Value (₹)
                  </label>
                  <select
                    value={valueCol}
                    onChange={(e) => setValueCol(e.target.value)}
                    className="w-full p-1.5 text-xs text-slate-800 dark:text-slate-200 m3-select"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Preview rows table */}
          {previewRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Data Preview (First {previewRows.length} Rows)
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Ready to map & import
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Name ({nameCol})</th>
                      <th className="p-2.5">Phone ({phoneCol})</th>
                      <th className="p-2.5">Source ({sourceCol})</th>
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-normal">
                    {previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-medium">{r[nameCol]}</td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{r[phoneCol]}</td>
                        <td className="p-2.5">{r[sourceCol] || 'Manual'}</td>
                        <td className="p-2.5 text-slate-500 truncate max-w-xs">{r[notesCol] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-import"
            type="button"
            onClick={handleExecuteImport}
            disabled={isProcessing || !csvText}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#2E6E5C] hover:bg-[#255e4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E6E5C] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'Importing Leads...' : 'Import Leads to Pipeline'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
