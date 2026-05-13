"use client";

import { useRef, useState } from "react";

interface Props {
  accessKey: string;
  onUploaded: (url: string) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg";

export default function UploadArea({ accessKey, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("僅支援 PNG / JPG（SVG 在 POC 階段暫不支援）");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("檔案超過 10MB，請壓縮後再試");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/poc/upload-logo?key=${encodeURIComponent(accessKey)}`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "上傳失敗");
        setUploading(false);
        return;
      }

      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pt-12">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">上傳你的 Logo</h2>
        <p className="text-fg2">PNG 或 JPG · 最大 10MB</p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`block border-2 border-dashed rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-fg3/40 hover:border-accent/60 bg-bg2"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="text-5xl mb-4">{uploading ? "⏳" : "📂"}</div>
        <p className="font-display text-lg font-medium mb-2">
          {uploading ? "上傳中..." : "拖放檔案到此 或 點擊選擇"}
        </p>
        <p className="text-fg3 text-sm font-mono">PNG / JPG · ≤ 10MB</p>
      </label>

      {error && (
        <div className="mt-4 p-4 bg-accent/10 border border-accent/40 rounded-lg text-accent text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
