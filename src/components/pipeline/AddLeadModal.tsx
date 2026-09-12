import React, { useState } from 'react';
import { X, UserPlus, Phone, User, Tag, FileText, Briefcase, IndianRupee } from 'lucide-react';
import { Lead, LeadSource, User as UserType } from '../../types';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (lead: Partial<Lead>) => Promise<void>;
  users: UserType[];
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  users
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [source, setSource] = useState<LeadSource>('IndiaMART');
  const [industry, setIndustry] = useState('Real Estate');
  const [value, setValue] = useState('1500000');
  const [assignedRepId, setAssignedRepId] = useState(users[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const modalRef = useModalFocusTrap(isOpen, onClose, '#input-lead-name');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Lead name is required');
      return;
    }
    if (!phone.trim() || phone.trim() === '+91') {
      setError('Valid phone number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        source,
        industry,
        value: Number(value) || 500000,
        assignedRepId: assignedRepId || users[0]?.id,
        notes: notes.trim()
      });
      // reset form
      setName('');
      setPhone('+91 ');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        id="modal-add-lead"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-lead-title"
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden outline-none"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#1F3A5F] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2E6E5C] flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-add-lead-title" className="text-base font-bold">Add New Sales Lead</h2>
              <p className="text-xs text-slate-300">Enter customer details for telecalling & WhatsApp outreach</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add lead dialog"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Lead Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-lead-name"
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-lead-phone"
                  type="text"
                  required
                  placeholder="+91 98201 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Lead Source */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lead Source
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  id="select-lead-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                  className="w-full pl-9 pr-3 py-2 text-xs focus:ring-[#2E6E5C] m3-select"
                >
                  <option value="IndiaMART">IndiaMART</option>
                  <option value="WhatsApp">WhatsApp Inbound</option>
                  <option value="Website">Website Form</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Facebook">Facebook Ads</option>
                  <option value="Manual">Manual Entry</option>
                </select>
              </div>
            </div>

            {/* Target Industry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMB Vertical
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  id="select-lead-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs focus:ring-[#2E6E5C] m3-select"
                >
                  <option value="Real Estate">Real Estate (Residential/Commercial)</option>
                  <option value="Education">Education (EdTech / Certification)</option>
                  <option value="Lending">Lending & SME Business Loans</option>
                  <option value="Insurance">Insurance (Health / Term / Motor)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Estimated Deal Value */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Deal Value (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-lead-value"
                  type="number"
                  placeholder="1500000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
                />
              </div>
            </div>

            {/* Assigned Rep */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign to Telecaller
              </label>
              <select
                id="select-lead-rep"
                value={assignedRepId}
                onChange={(e) => setAssignedRepId(e.target.value)}
                className="w-full px-3 py-2 text-xs focus:ring-[#2E6E5C] m3-select"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Requirement Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Customer Notes / Requirement Summary
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                id="textarea-lead-notes"
                rows={3}
                placeholder="e.g. Inquired about loan eligibility, prefers morning 11 AM calls on WhatsApp..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-lead"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#2E6E5C] hover:bg-[#245b4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E6E5C] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 transition-all shadow-xs"
            >
              {isSubmitting ? 'Saving Lead...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
