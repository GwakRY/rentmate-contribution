
import React from "react";
import { Upload } from "lucide-react";

interface PhotoUploadSectionProps {
  photoUrls: string[];
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: (index: number) => void;
}

const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  photoUrls,
  handlePhotoUpload,
  removePhoto,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">사진</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {photoUrls.map((url, index) => (
          <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
            <img
              src={url}
              alt={`상품 사진 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
              onClick={() => removePhoto(index)}
            >
              <span className="sr-only">Remove</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {photoUrls.length < 5 && (
          <label className="border-2 border-dashed rounded-md flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-gray-50">
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">사진 추가</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        )}
      </div>
      <p className="text-sm text-gray-500">최대 5장의 사진을 업로드할 수 있습니다.</p>
    </div>
  );
};

export default PhotoUploadSection;
