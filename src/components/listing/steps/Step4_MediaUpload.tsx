import React, { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { supabase, requireValidSession } from '../../../lib/supabase';
import {
  Upload, X, FileText, Loader2, Video,
  AlertCircle, Camera
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
    if (!user) throw new Error('Please sign in again to continue uploading.');

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
    if (!(await requireValidSession())) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const { file, type } = filesToUpload[i];
        const maxSize = type === 'video' ? 50 : type === 'survey' ? 10 : 5;

        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Please choose a file under ${maxSize}MB.`);
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
      const msg = err instanceof Error ? err.message : 'Something went wrong while uploading. Please try again.';
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
      <div className="text-center">
        <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-2">
          Step 4 of 6
        </div>
        <h2 className="font-serif text-[24px] font-semibold text-paper tracking-tight mb-2">
          Photos and Videos
        </h2>
        <p className="text-[13px] text-paper/45">
          Good photos help more {listingType === 'house' ? 'tenants' : 'buyers'} find and trust your listing
        </p>
      </div>

      {uploadError && (
        <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] text-danger">{uploadError}</p>
            {pendingFiles.length > 0 && (
              <button
                onClick={() => processUploads(pendingFiles)}
                className="text-[12px] font-semibold text-danger underline mt-1"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[13px] font-semibold text-paper">
            Property Photos <span className="text-danger">*</span>
          </label>
          <span className="text-[11px] text-paper/25">
            {images.length}/10
          </span>
        </div>
        <p className="text-[12px] text-paper/35 mb-3">Add at least 3 clear photos taken in good light.</p>

        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => handleFileChange(e, 'image')}
        />

        <button
          type="button"
          onClick={() => !uploading && imageInputRef.current?.click()}
          disabled={uploading}
          className={`w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            errors.images
              ? 'border-danger/30 bg-danger/5'
              : 'border-white/12 hover:border-gold/50 hover:bg-gold/5'
          } ${uploading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="text-[14px] font-semibold text-paper/70">
                Uploading, {uploadProgress}%
              </p>
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center">
                <Camera className="w-7 h-7 text-gold" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-paper">Add Photos</p>
                <p className="text-[12px] text-paper/35 mt-1">
                  Tap here to choose photos from your phone or computer
                </p>
              </div>
            </>
          )}
        </button>

        {errors.images && (
          <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.images.message}
          </p>
        )}

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
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 w-7 h-7 bg-danger text-paper rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {i === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-ink/70 text-[9px] font-bold text-gold text-center py-1 uppercase tracking-wider">
                    Main
                  </div>
                )}
              </div>
            ))}
            {images.length < 10 && (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                aria-label="Add another photo"
                className="aspect-square rounded-xl border-2 border-dashed border-white/12 hover:border-white/25 flex items-center justify-center text-paper/25 hover:text-paper/45 transition-all"
              >
                <Upload className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[13px] font-semibold text-paper">
            Videos <span className="text-paper/25 font-normal">(optional, up to 3)</span>
          </label>
          <span className="text-[11px] text-paper/25">{videos.length}/3</span>
        </div>

        {videos.length < 3 && (
          <>
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={e => handleFileChange(e, 'video')}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-white/12 hover:border-gold/50 hover:bg-gold/5 rounded-2xl p-6 text-center transition-all"
            >
              <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center">
                <Video className="w-6 h-6 text-gold" />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-bold text-paper">Add a Video</p>
                <p className="text-[12px] text-paper/35 mt-0.5">A short walkthrough helps people trust your listing</p>
              </div>
            </button>
          </>
        )}

        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {videos.map((url, i) => (
              <div
                key={i}
                className="relative aspect-video rounded-xl overflow-hidden border border-white/8 group bg-ink"
              >
                <video src={url} className="w-full h-full" controls />
                <button
                  type="button"
                  onClick={() => setValue('videos', videos.filter(v => v !== url))}
                  aria-label="Remove video"
                  className="absolute top-2 right-2 w-8 h-8 bg-danger text-paper rounded-xl flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {listingType === 'land' && (
        <div className="pt-4 border-t border-white/5">
          <label className="block text-[13px] font-semibold text-paper mb-3">
            Survey Plan <span className="text-paper/25 font-normal">(optional)</span>
          </label>

          {surveyPlanUrl ? (
            <div className="flex items-center justify-between p-4 bg-gold/8 border border-gold/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-paper">Survey plan uploaded</p>
                  <a
                    href={surveyPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-gold/70 hover:text-gold transition-colors"
                  >
                    View document
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValue('survey_plan_url', undefined)}
                aria-label="Remove survey plan"
                className="text-paper/30 hover:text-danger transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={surveyInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={e => handleFileChange(e, 'survey')}
              />
              <button
                type="button"
                onClick={() => surveyInputRef.current?.click()}
                className="flex items-center gap-3 w-full p-4 bg-white/4 border border-white/8 hover:border-white/15 hover:bg-white/6 rounded-xl transition-all text-left"
              >
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-paper/40" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-paper/70">Upload survey plan</p>
                  <p className="text-[11px] text-paper/25 mt-0.5">A photo or PDF of your document works fine</p>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
