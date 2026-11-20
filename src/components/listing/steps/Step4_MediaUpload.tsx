import React, { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { supabase, requireValidSession } from '../../../lib/supabase';
import {
  Upload,
  X,
  FileText,
  Loader2,
  Video,
  AlertCircle,
  Camera,
  Check,
  Image as ImageIcon,
  Film,
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
  const [pendingFiles, setPendingFiles] = useState<
    { file: File; type: 'image' | 'video' | 'survey' }[]
  >([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const surveyInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    type: 'image' | 'video' | 'survey'
  ) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Please sign in again to continue uploading.');
    }

    const fileExt = file.name.split('.').pop();
    const subFolder =
      type === 'image' ? 'photos' : type === 'video' ? 'videos' : 'survey';

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${subFolder}/${fileName}`;

    const { error } = await supabase.storage
      .from('property-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

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
          throw new Error(
            `${file.name} is too large. Please choose a file under ${maxSize}MB.`
          );
        }

        const url = await uploadFile(file, type);

        if (type === 'image') {
          setValue('images', [...(form.getValues('images') || []), url]);
        } else if (type === 'video') {
          setValue('videos', [...(form.getValues('videos') || []), url]);
        } else {
          setValue('survey_plan_url', url);
        }

        setUploadProgress(
          Math.round(((i + 1) / filesToUpload.length) * 100)
        );
      }

      setPendingFiles([]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong while uploading. Please try again.';

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

    const newFiles = Array.from(files).map((file) => ({ file, type }));

    setPendingFiles(newFiles);
    processUploads(newFiles);
    e.target.value = '';
  };

  const sectionHeading = (title: string, subtitle: string) => (
    <div className="mb-4">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-paper/80">
        {title}
      </h3>
      <p className="mt-1.5 text-[11px] leading-5 text-paper/40">
        {subtitle}
      </p>
    </div>
  );

  return (
    <div
      className="space-y-9"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-px w-7 bg-gold" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold">
            Listing details · 04
          </span>
        </div>

        <h2 className="font-serif text-[30px] sm:text-[34px] font-medium leading-tight tracking-tight text-paper">
          Let people see what you're offering.
        </h2>

        <p className="max-w-lg text-[13px] leading-6 text-paper/50">
          Strong visuals make a listing more informative and help prospective{' '}
          {listingType === 'house' ? 'tenants' : 'buyers'} understand what
          they're considering.
        </p>
      </header>

      {uploadError && (
        <div className="flex items-start gap-3 border border-danger/30 bg-danger/[0.06] p-4">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] leading-5 text-danger">
              {uploadError}
            </p>

            {pendingFiles.length > 0 && (
              <button
                type="button"
                onClick={() => processUploads(pendingFiles)}
                className="mt-2 text-[11px] font-bold text-danger underline underline-offset-4"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-paper/80">
              Property photographs
              <span className="ml-1 text-danger">*</span>
            </h3>
            <p className="mt-1.5 text-[11px] text-paper/40">
              Add at least 3 clear photos taken in good lighting.
            </p>
          </div>

          <span className="shrink-0 text-[11px] tabular-nums text-paper/45">
            <span className="text-paper font-semibold">{images.length}</span>
            {' '}/ 10
          </span>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'image')}
        />

        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => !uploading && imageInputRef.current?.click()}
            disabled={uploading}
            className={`flex min-h-[220px] w-full flex-col items-center justify-center border border-dashed p-7 text-center transition-all duration-200 ${
              errors.images
                ? 'border-danger/50 bg-danger/[0.04]'
                : 'border-white/20 bg-white/[0.02] hover:border-gold/55 hover:bg-gold/[0.035]'
            } ${uploading ? 'cursor-wait' : 'cursor-pointer'}`}
          >
            {uploading ? (
              <>
                <Loader2 size={30} className="animate-spin text-gold" />
                <p className="mt-4 text-[13px] font-semibold text-paper/80">
                  Uploading photographs
                </p>
                <p className="mt-1 text-[11px] text-paper/40">
                  {uploadProgress}% complete
                </p>
                <div className="mt-4 h-1 w-full max-w-[210px] overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center border border-gold/25 bg-gold/[0.07]">
                  <Camera size={25} className="text-gold" />
                </div>
                <p className="mt-5 text-[14px] font-semibold text-paper">
                  Add property photos
                </p>
                <p className="mt-2 text-[11px] text-paper/40">
                  Choose images from your device
                </p>
                <span className="mt-4 border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-paper/65">
                  Browse photographs
                </span>
                <p className="mt-4 text-[10px] text-paper/25">
                  JPG, PNG or WEBP · Maximum 5MB per image
                </p>
              </>
            )}
          </button>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden border border-white/10 bg-white/[0.03]"
                >
                  <img
                    src={url}
                    alt={`Property photograph ${i + 1}`}
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        'images',
                        images.filter((img) => img !== url)
                      )
                    }
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center bg-danger text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>

                  {i === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-[#0B0D10]/85 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-gold">
                      <Check size={11} />
                      Cover photo
                    </div>
                  )}
                </div>
              ))}

              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => !uploading && imageInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Add another photo"
                  className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-white/20 text-paper/40 transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-40"
                >
                  <Upload size={20} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Add photo
                  </span>
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-[10px] text-paper/35">
              <ImageIcon size={13} />
              Your first photograph will be used as the cover image.
            </div>

            {uploading && (
              <div className="mt-4 border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] text-paper/55">
                  <span>Uploading photographs...</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="h-1 overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {errors.images && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-danger">
            <AlertCircle size={12} />
            {errors.images.message}
          </p>
        )}
      </section>

      <section className="border-t border-white/10 pt-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035]">
              <Film size={18} className="text-paper/55" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-paper/80">
                Property videos
              </h3>
              <p className="mt-1 text-[11px] text-paper/40">
                Optional · Up to 3 videos
              </p>
            </div>
          </div>

          <span className="text-[11px] tabular-nums text-paper/40">
            {videos.length}/3
          </span>
        </div>

        {videos.length < 3 && (
          <>
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'video')}
            />

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 flex w-full items-center gap-4 border border-dashed border-white/15 bg-white/[0.02] p-4 text-left transition-colors hover:border-gold/40 hover:bg-gold/[0.025] disabled:opacity-40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/[0.06]">
                <Video size={19} className="text-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-paper/80">
                  Add a walkthrough video
                </p>
                <p className="mt-1 text-[10px] leading-5 text-paper/35">
                  MP4, MOV or WEBM · Maximum 50MB per video
                </p>
              </div>
              <Upload size={16} className="shrink-0 text-paper/40" />
            </button>
          </>
        )}

        {videos.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videos.map((url, i) => (
              <div
                key={i}
                className="group relative overflow-hidden border border-white/10 bg-black"
              >
                <video
                  src={url}
                  className="aspect-video w-full"
                  controls
                />
                <button
                  type="button"
                  onClick={() =>
                    setValue(
                      'videos',
                      videos.filter((v) => v !== url)
                    )
                  }
                  aria-label="Remove video"
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center bg-danger text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {listingType === 'land' && (
        <section className="border-t border-white/10 pt-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035]">
              <FileText size={18} className="text-paper/55" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-paper/80">
                Survey plan
              </h3>
              <p className="mt-1 text-[11px] text-paper/40">
                Optional · Supporting land documentation
              </p>
            </div>
          </div>

          {surveyPlanUrl ? (
            <div className="flex items-center justify-between gap-3 border border-gold/25 bg-gold/[0.05] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-gold/10">
                  <FileText size={19} className="text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-paper">
                    Survey plan uploaded
                  </p>
                  <a
                    href={surveyPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[10px] font-semibold text-gold hover:underline"
                  >
                    View document
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setValue('survey_plan_url', undefined)}
                aria-label="Remove survey plan"
                className="flex h-8 w-8 shrink-0 items-center justify-center text-paper/40 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X size={17} />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={surveyInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'survey')}
              />

              <button
                type="button"
                onClick={() => surveyInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center gap-4 border border-dashed border-white/15 bg-white/[0.02] p-4 text-left transition-colors hover:border-gold/40 hover:bg-gold/[0.025] disabled:opacity-40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/[0.06]">
                  <FileText size={19} className="text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-paper/80">
                    Upload survey plan
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-paper/35">
                    PDF, JPG, PNG or WEBP · Maximum 10MB
                  </p>
                </div>
                <Upload size={16} className="shrink-0 text-paper/40" />
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
};
