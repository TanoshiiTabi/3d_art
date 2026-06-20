"use client";

import { useCallback, useState } from "react";

interface UploaderProps {
  onImageLoad: (dataUrl: string) => void;
}

export default function Uploader({ onImageLoad }: UploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setPreview(url);
        onImageLoad(url);
      };
      reader.readAsDataURL(file);
    },
    [onImageLoad]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <label
        htmlFor="image-upload"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center w-72 h-44 rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-300 group
          ${isDragging
            ? "border-violet-400 bg-violet-900/20 scale-105"
            : "border-slate-600 bg-slate-900/50 hover:border-violet-500 hover:bg-slate-800/50"
          }
        `}
      >
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />

        {preview ? (
          <img
            src={preview}
            alt="preview"
            className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-60 group-hover:opacity-80 transition-opacity"
          />
        ) : null}

        <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none">
          <svg
            className={`w-10 h-10 transition-colors ${preview ? "text-white" : "text-slate-500 group-hover:text-violet-400"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M6.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <span className={`text-sm font-medium ${preview ? "text-white drop-shadow" : "text-slate-400 group-hover:text-violet-300"}`}>
            {preview ? "Click to replace image" : "Drag & drop or click to upload"}
          </span>
          {!preview && (
            <span className="text-xs text-slate-500">JPG · PNG · WebP</span>
          )}
        </div>
      </label>
    </div>
  );
}
