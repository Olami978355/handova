import React, { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { supabase } from '../../../lib/supabase';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Video, AlertCircle } from 'lucide-react';
import { COLORS } from '../../../constants';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step4_MediaUpload: React.FC<StepProps> = ({ form }) => {
  const { watch, setValue, formState: { errors } } = form;
  const listingType = watch('listing_type');
  const images = watch('images') || [];
  const videos = watch('videos') || [];
  const surveyPlanUrl = watch('survey_plan_url');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{ file: File, type: 'image' | 'video' | 'survey' }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const surveyInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'image' | 'video' | 'survey') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const subFolder = type === 'image' ? 'photos' : type === 'video' ? 'videos' : 'survey';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${subFolder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('property-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('property-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const processUploads = async (filesToUpload: { file: File, type: 'image' | 'video' | 'survey' }[]) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const totalFiles = filesToUpload.length;
    const newUrls: { type: string, url: string }[] = [];

    try {
      for (let i = 0; i < totalFiles; i++) {
        const { file, type } = filesToUpload[i];
        
        // Validation
        let maxSize = 5 * 1024 * 1024; // 5MB for images
        if (type === 'video') maxSize = 50 * 1024 * 1024; // 50MB for videos
        if (type === 'survey') maxSize = 10 * 1024 * 1024; // 10MB for survey

        if (file.size > maxSize) {
          throw new Error(`${file.name} is too large. Max size is ${maxSize / (1024 * 1024)}MB`);
        }

        const url = await uploadFile(file, type);
        newUrls.push({ type, url });
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      // Update form state
      newUrls.forEach(({ type, url }) => {
        if (type === 'image') {
          setValue('images', [...(form.getValues('images') || []), url]);
        } else if (type === 'video') {
          setValue('videos', [...(form.getValues('videos') || []), url]);
        } else if (type === 'survey') {
          setValue('survey_plan_url', url);
        }
      });

      setPendingFiles([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload files');
      // Keep remaining files in pending for retry
      const failedIndex = newUrls.length;
      setPendingFiles(filesToUpload.slice(failedIndex));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'survey') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending = Array.from(files).map(file => ({ file, type }));
    setPendingFiles(prev => [...prev, ...newPending]);
    processUploads([...pendingFiles, ...newPending]);
  };

  const retryUpload = () => {
    if (pendingFiles.length > 0) {
      processUploads(pendingFiles);
    }
  };

  const removeImage = (url: string) => {
    setValue('images', images.filter(img => img !== url));
  };

  const removeVideo = (url: string) => {
    setValue('videos', videos.filter(v => v !== url));
  };

  const removeSurvey = () => {
    setValue('survey_plan_url', undefined);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Media Upload</h2>
        <p className="text-gray-500 mt-2">Add high-quality photos and videos to attract more {listingType === 'house' ? 'tenants' : 'buyers'}</p>
      </div>

      <div className="space-y-6">
        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property Photos (Min 3, Max 10)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              errors.images ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-[#1a6b3c] hover:bg-[#1a6b3c]/5'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e, 'image')}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="animate-spin text-[#1a6b3c] mb-2" size={32} />
                <p className="text-sm font-medium text-gray-600">Uploading... {uploadProgress}%</p>
                <div className="w-full max-w-xs bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-[#1a6b3c] h-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : uploadError ? (
              <div className="flex flex-col items-center">
                <AlertCircle className="text-red-500 mb-2" size={32} />
                <p className="text-sm font-medium text-red-600">{uploadError}</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    retryUpload();
                  }}
                  className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
                >
                  Retry Failed Uploads
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Upload className="text-gray-400" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-700">Click to upload photos or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP up to 5MB each</p>
              </div>
            )}
          </div>
          {errors.images && <p className="text-xs text-red-500 mt-1">{errors.images.message}</p>}
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {images.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                <img src={url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={14} />
                </button>
                {idx === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-0.5 text-center font-medium">
                    Main Photo
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Videos */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Property Videos (Max 3)</label>
          <div 
            onClick={() => videoInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center transition-all cursor-pointer hover:border-[#1a6b3c] hover:bg-[#1a6b3c]/5"
          >
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleFileUpload(e, 'video')}
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Video className="text-gray-400" size={24} />
              </div>
              <p className="text-sm font-medium text-gray-700">Click to upload videos</p>
              <p className="text-xs text-gray-500 mt-1">MP4, MOV, WEBM up to 50MB each</p>
            </div>
          </div>
        </div>

        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 group bg-black">
                <video src={url} className="w-full h-full" controls />
                <button
                  type="button"
                  onClick={() => removeVideo(url)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {listingType === 'land' && (
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Survey Plan (Optional PDF/Image)</label>
            {surveyPlanUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#1a6b3c] bg-[#1a6b3c]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#1a6b3c] text-white flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700">Survey Plan Uploaded</p>
                    <a href={surveyPlanUrl} target="_blank" rel="noreferrer" className="text-xs text-[#1a6b3c] hover:underline">View Document</a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeSurvey}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => surveyInputRef.current?.click()}
                className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
              >
                <input
                  type="file"
                  ref={surveyInputRef}
                  onChange={(e) => handleFileUpload(e, 'survey')}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-700">Upload Survey Plan</p>
                  <p className="text-xs text-gray-500">PDF, JPG, PNG, WebP (Max 10MB)</p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
