import React, { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { supabase } from '../../../lib/supabase';
import {
  Upload, X, FileText, Loader2, Video,
  AlertCircle, CheckCircle, Image as ImageIcon
} from 'lucide-react';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step4_MediaUpload: React.FC<StepProps> = ({ form }) => {
  const { watch, setValue, formState: { errors } } = form;
  const listingType = watch('listing_type');
  const images = watch('images') || [];
  const videos = watch('videos') || [];
  const surveyPlanUrl = watch('survey_plan_url');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; type: 'image' | 'video' | 'survey' }[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const surveyInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'image' | 'video' | 'survey') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const subFolder = type === 'image' ? 'photos' : type === 'video' ? 'videos' : 'survey';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${subFolder}/${fileName}`;

    const { error } = await supabase.storage
      .from('property-assets')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('property-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const processUploads = async (
    filesToUpload: { file: File; type: 'image' | 'video' | 'survey' }[]
  ) => {
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const { file, type } = filesToUpload[i];
        const maxSize = type === 'video' ? 50 : type === 'survey' ? 10 : 5;

        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Max size is ${maxSize}MB`);
        }

        const url = await uploadFile(file, type);

        if (type === 'image') {
          setValue('images', [...(form.getValues('images') || []), url]);
        } else if (type === 'video') {
          setValue('videos', [...(form.getValues('videos') || []), url]);
        } else {
          setValue('survey_plan_url', url);
        }

        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      }
      setPendingFiles([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video' | 'survey'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map(file => ({ file, type }));
    setPendingFiles(newFiles);
    processUploads(newFiles);
    e.target.value = '';
  };

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
          Step 4 of 6
        </div>
        <h2 className="text-[22px] font-black text-white tracking-tight mb-2">
          Media Upload
        </h2>
        <p className="text-[13px] text-white/45">
          Add high quality photos and videos to attract more {listingType === 'house' ? 'tenants' : 'buyers'}
        </p>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] text-red-400">{uploadError}</p>
            {pendingFiles.length > 0 && (
              <button
                onClick={() => processUploads(pendingFiles)}
                className="text-[12px] font-semibold text-red-400 underline mt-1"
              >
                Retry upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">
            Property Photos <span className="text-red-400">*</span>
          </label>
          <span className="text-[11px] text-white/25">
            {images.length}/10 · Min 3 required
          </span>
        </div>

        <div
          onClick={() => !uploading && imageInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            errors.images
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-white/10 hover:border-[#1a6b3c]/50 hover:bg-[#1a6b3c]/5'
          } ${uploading ? 'cursor-wait' : ''}`}
        >
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFileChange(e, 'image')}
          />

          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-[#1a6b3c] animate-spin mb-3" />
              <p className="text-[13px] font-semibold text-white/60">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-48 h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-[#1a6b3c] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-[13px] font-semibold text-white/55">
                Click to upload photos
              </p>
              <p className="text-[11px] text-white/25 mt-1">
                JPG, PNG, WebP · Max 5MB each
              </p>
            </div>
          )}
        </div>

        {errors.images && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.images.message}
          </p>
        )}

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
            {images.map((url, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/8 group"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setValue('images', images.filter(img => img !== url))}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] font-bold text-[#f0c040] text-center py-1 uppercase tracking-wider">
                    Main
                  </div>
                )}
              </div>
            ))}
            {images.length < 10 && (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex items-center justify-center text-white/20 hover:text-white/40 transition-all"
              >
                <Upload className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Videos */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">
            Videos <span className="text-white/20 font-normal normal-case">(optional · max 3)</span>
          </label>
          <span className="text-[11px] text-white/25">{videos.length}/3</span>
        </div>

        {videos.length < 3 && (
          <div
            onClick={() => videoInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-[#1a6b3c]/50 hover:bg-[#1a6b3c]/5 rounded-2xl p-6 text-center cursor-pointer transition-all"
          >
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={e => handleFileChange(e, 'video')}
            />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                <Video className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-[13px] font-semibold text-white/55">Click to upload videos</p>
              <p className="text-[11px] text-white/25 mt-1">MP4, MOV, WEBM · Max 50MB each</p>
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {videos.map((url, i) => (
              <div
                key={i}
                className="relative aspect-video rounded-xl overflow-hidden border border-white/8 group bg-black"
              >
                <video src={url} className="w-full h-full" controls />
                <button
                  type="button"
                  onClick={() => setValue('videos', videos.filter(v => v !== url))}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Survey plan — land only */}
      {listingType === 'land' && (
        <div className="pt-4 border-t border-white/5">
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            Survey Plan <span className="text-white/20 font-normal normal-case">(optional)</span>
          </label>

          {surveyPlanUrl ? (
            <div className="flex items-center justify-between p-4 bg-[#1a6b3c]/10 border border-[#1a6b3c]/25 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1a6b3c]/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#4ade80]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Survey plan uploaded</p>
                  <a
                    href={surveyPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#f0c040]/70 hover:text-[#f0c040] transition-colors"
                  >
                    View document →
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValue('survey_plan_url', undefined)}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => surveyInputRef.current?.click()}
              className="flex items-center gap-3 w-full p-4 bg-white/4 border border-white/8 hover:border-white/15 hover:bg-white/6 rounded-xl transition-all text-left"
            >
              <input
                ref={surveyInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={e => handleFileChange(e, 'survey')}
              />
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white/30" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white/60">Upload survey plan</p>
                <p className="text-[11px] text-white/25 mt-0.5">PDF, JPG, PNG · Max 10MB</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
