"use client";

import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { uploadPhoto, PHOTO_ACCEPT } from "@/lib/photoUpload";

interface PhotoBoxProps {
  url: string;
  memberId?: string;
  onUploaded: (url: string) => void;
  onCleared: () => void;
}

export function PhotoBox({ url, memberId, onUploaded, onCleared }: PhotoBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = url || "/default-profile.jpg";

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadPhoto(memberId || "new", file);
      onUploaded(uploaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="w-[150px] h-[150px] flex-shrink-0 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
        <img
          src={src}
          alt="프로필"
          className="w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          <Upload className="h-3 w-3" />
          {uploading ? "업로드 중..." : "사진 업로드"}
        </button>
        {url && (
          <button
            type="button"
            onClick={onCleared}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 ml-auto"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
