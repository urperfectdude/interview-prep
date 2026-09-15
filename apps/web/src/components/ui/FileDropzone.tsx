"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "./Button";

interface FileDropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileDropzone({ label, hint, accept, file, onFileChange }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function clearFile() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {file ? (
        <div className="flex animate-enter items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
          <span className="flex size-9 flex-none items-center justify-center rounded-md bg-accent text-accent-foreground">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Remove file" onClick={clearFile}>
            <X />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) onFileChange(dropped);
          }}
          className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-6 text-center outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 [&>*]:pointer-events-none ${
            isDragActive ? "border-primary bg-accent" : "border-input hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-primary">
            <Upload className="size-4" />
          </span>
          <span className="text-sm font-medium">{label}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      )}
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
