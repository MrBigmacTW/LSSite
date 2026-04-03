"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PrintAreaEditor from "./PrintAreaEditor";
import { imageUrl } from "@/lib/url";
import { compressImage } from "@/lib/compress-image";

interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  imagePath: string;
  printArea: { x: number; y: number; width: number; height: number };
  active: boolean;
  sortOrder: number;
}

export default function TemplateManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function handleUploadBase(templateId: string, file: File) {
    setUploading(templateId);
    try {
      const compressed = await compressImage(file, 2400, 0.9);
      const formData = new FormData();
      formData.append("baseImage", compressed);

      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`上傳失敗: ${data.error || res.statusText}`);
      }
    } catch (err) {
      alert(`上傳錯誤: ${err}`);
    }
    setUploading(null);
    router.refresh();
  }

  async function handleSavePrintArea(templateId: string, printArea: { x: number; y: number; width: number; height: number }) {
    await fetch(`/api/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printArea }),
    });
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {templates.map((t) => (
        <div key={t.id} className="bg-bg2 border border-bg3 p-5">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Thumbnail */}
            <div className="relative w-32 h-40 bg-bg3 flex-shrink-0 overflow-hidden">
              {t.imagePath ? (
                <img
                  src={imageUrl(t.imagePath)}
                  alt={t.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full font-mono text-[10px] text-fg3">
                  無底圖
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-body text-sm font-medium text-fg">{t.name}</h3>
              <p className="font-mono text-[11px] text-fg3 mt-1">{t.slug}</p>
              <p className="font-mono text-[10px] text-fg3 mt-1">
                品類: {t.category} | printArea: {t.printArea.width}x{t.printArea.height} @ ({t.printArea.x},{t.printArea.y})
              </p>
              <div className="flex items-center gap-3 mt-3">
                {/* Upload base image */}
                <label className="px-3 py-1.5 border border-bg3 font-mono text-[11px] text-fg3 hover:text-fg2 hover:border-fg3 cursor-pointer transition-colors">
                  {uploading === t.id ? "上傳中..." : "上傳底圖"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadBase(t.id, file);
                    }}
                  />
                </label>

                {/* Edit printArea */}
                <button
                  onClick={() => setEditing(editing === t.id ? null : t.id)}
                  className="px-3 py-1.5 border border-bg3 font-mono text-[11px] text-fg3 hover:text-fg2 hover:border-fg3 transition-colors"
                >
                  {editing === t.id ? "關閉編輯" : "編輯 printArea"}
                </button>

                {/* Status */}
                <span className={`font-mono text-[11px] ${t.active ? "text-green-400" : "text-fg3"}`}>
                  {t.active ? "啟用中" : "已停用"}
                </span>
              </div>
            </div>
          </div>

          {/* PrintArea Editor */}
          {editing === t.id && t.imagePath && (
            <div className="mt-5 border-t border-bg3 pt-5">
              <PrintAreaEditor
                imageSrc={imageUrl(t.imagePath)}
                initialArea={t.printArea}
                onSave={(area) => handleSavePrintArea(t.id, area)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
