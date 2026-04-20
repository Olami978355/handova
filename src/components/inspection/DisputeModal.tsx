import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertCircle, Upload, Loader2, CheckCircle, 
  Shield, Info, Camera, Video, FileText 
} from 'lucide-react';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { InspectionBooking } from '../../types';

interface DisputeModalProps {
  booking: InspectionBooking;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ 
  booking, 
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const { raiseDispute, loading } = useInspectionBooking();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const disputeReasons = [
    'Landlord did not show up',
    'Property does not match description',
    'Property is already occupied',
    'Landlord was unprofessional',
    'Property has major structural issues',
    'Other'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || description.length < 50) {
      setError('Please provide a reason and at least 50 characters of description.');
      return;
    }

    try {
      await raiseDispute(booking.id, `${reason}: ${description}`, files);
      setStep(2); // Success step
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to raise dispute');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Dispute">
      <div className="p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex gap-4">
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                <div className="space-y-2">
                  <h3 className="font-bold text-red-900">Important Notice</h3>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Raising a dispute will freeze the inspection fee. A moderator will review your evidence and the landlord's response. False disputes may lead to account suspension.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Reason for Dispute</label>
                  <select 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select a reason</option>
                    {disputeReasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">
                    Description (Min 50 chars)
                    <span className="ml-2 text-xs font-normal text-zinc-400">{description.length}/50</span>
                  </label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    placeholder="Provide detailed evidence of what happened..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Evidence (Photos/Videos)</label>
                  <div className="grid grid-cols-4 gap-3">
                    {files.map((file, index) => (
                      <div key={index} className="relative aspect-square bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200">
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          {file.type.startsWith('image') ? <Camera size={20} /> : <Video size={20} />}
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:border-red-500 hover:text-red-500 transition-all cursor-pointer">
                      <Upload size={20} />
                      <span className="text-[10px] font-bold mt-1">Add</span>
                      <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Submit Dispute'}
                </button>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-600/20">
                <Shield size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Dispute Raised</h3>
              <p className="text-zinc-500 mb-8 max-w-xs mx-auto">
                Our moderation team has been notified. We will review your evidence and get back to you within 24-48 hours.
              </p>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

const Modal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150]"
          />
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-lg h-fit bg-white rounded-[40px] z-[160] overflow-hidden shadow-2xl"
          >
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
