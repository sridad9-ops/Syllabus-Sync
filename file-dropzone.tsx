"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFileSelected: (file: File | null) => void;
}

export function FileDropzone({ onFileSelected }: FileDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const f = acceptedFiles[0] ?? null;
      setFile(f);
      onFileSelected(f);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: false,
  });

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setFile(null);
    onFileSelected(null);
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        isDragActive ? "border-primary bg-secondary" : "border-muted-foreground/25 hover:border-primary/50"
      )}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-5 w-5" />
          <span className="font-medium">{file.name}</span>
          <button onClick={clear} className="rounded-full p-1 hover:bg-muted" aria-label="Remove file">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop your syllabus here" : "Drag & drop your syllabus, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">PDF or Word (.docx)</p>
        </>
      )}
    </div>
  );
}
