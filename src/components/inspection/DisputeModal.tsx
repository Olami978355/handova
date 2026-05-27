import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, AlertCircle, Upload, Loader2,
  Shield, Camera, Video
} from 'lucide-react';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { InspectionBooking } from '../../types';

interface DisputeModalProps {
  booking: InspectionBooking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const disputeReasons = [
  'Landlord did not show up',
  'Property does not match description',
  'Property is already occupied',
  'Landlord was unprofessional',
  'Property has major structural issues',
  'Other',
];

export const DisputeModal: React.FC<DisputeModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { raiseDispute, loading } = useInspectionBooking();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) { setError('Please select a reason.'); return; }
    if (description.length < 50) {
      setError('Please provide at least 50 characters of description.');
      return;
    }
    try {
      await raiseDispute(booking.id, `${reason}: ${description}`, files);
      setStep(2);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[150]"
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed inset-x-4 bottom-4 sm:inset-0 sm:m-auto sm:w-full sm:max-w-lg sm:h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[160] overflow-hidden shadow-2xl"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-[16px] font-bold text-white">Raise a Dispute</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="p-5 space-y-4 max-h-[70vh] overflow-y-auto"
                >
                  {/* Warning */}
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-bold text-red-400 mb-1">
                        Important
                      </p>
                      <p className="text-[11px] text-red-400/70 leading-relaxed">
                        Raising a dispute freezes the inspection fee. A moderator will review your evidence within 24-48 hours. False disputes may lead to account suspension.
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={reason}
                      onChange={e => { setReason(e.target.value); setError(null); }}
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0a1f11]">Select a reason</option>
                      {disputeReasons.map(r => (
                        <option key={r} value={r} className="bg-[#0a1f11]">{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <span className={`text-[11px] font-medium ${
                        description.length >= 50 ? 'text-[#4ade80]' : 'text-white/25'
                      }`}>
                        {description.length}/50 min
                      </span>
                    </div>
                    <textarea
                      value={description}
                      onChange={e => { setDescription(e.target.value); setError(null); }}
                      rows={4}
                      placeholder="Describe in detail what happened and how the property differed from the listing..."
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                    />
                  </div>

                  {/* Evidence */}
                  <div>
                    <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                      Evidence Photos/Videos <span className="text-white/20 font-normal normal-case">(optional but recommended)</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {files.map((file, i) => (
                        <div
                          key={i}
                          className="relative aspect-square bg-white/5 border border-white/8 rounded-xl overflow-hidden flex items-center justify-center"
                        >
                          {file.type.startsWith('image')
                            ? <Camera className="w-5 h-5 text-white/30" />
                            : <Video className="w-5 h-5 text-white/30" />
                          }
                          <button
                            type="button"
                            onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square bg-white/4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-white/25 hover:border-white/20 hover:text-white/40 transition-all cursor-pointer">
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[9px] font-bold uppercase">Add</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-[12px] text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3.5 rounded-xl font-semibold text-[13px] text-white/50 bg-white/5 hover:bg-white/8 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[13px] text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : 'Submit Dispute'
                      }
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 text-center"
                >
                  <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-[18px] font-black text-white mb-2">
                    Dispute Raised
                  </h3>
                  <p className="text-[13px] text-white/45 leading-relaxed mb-6 max-w-xs mx-auto">
                    Our moderation team has been notified and will review your evidence within 24-48 hours.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full bg-white/5 border border-white/8 text-white py-3.5 rounded-xl font-semibold text-[14px] hover:bg-white/8 transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};