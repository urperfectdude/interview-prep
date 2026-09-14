"use client";

import { useCallback, useRef, useState } from "react";

interface FileDropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function FileDropzone({ label, hint, accept, file, onFileChange }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const dropped = event.dataTransfer.files?.[0];
      if (dropped) onFileChange(dropped);
    },
    [onFileChange]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragActive ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-accent-soft/50"
        }`}
      >
        <span className="text-sm font-medium text-foreground">{file ? file.name : label}</span>
        {hint && !file && <span className="text-xs text-muted">{hint}</span>}
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="mt-1 text-xs text-accent underline"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
