"use client";

import { useState } from "react";
import LandingScreen from "./components/LandingScreen";
import ChatInterface from "./components/ChatInterface";
import UploadArea from "./components/UploadArea";
import GenerationResults from "./components/GenerationResults";
import MockupPreview from "./components/MockupPreview";

type Mode = "landing" | "chat" | "upload" | "results" | "mockup";

interface Props {
  accessKey: string;
}

export default function StudioClient({ accessKey }: Props) {
  const [mode, setMode] = useState<Mode>("landing");
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [selectedDesignUrl, setSelectedDesignUrl] = useState<string | null>(null);

  function reset() {
    setMode("landing");
    setCandidateUrls([]);
    setSelectedDesignUrl(null);
  }

  return (
    <main className="min-h-screen bg-bg text-fg">
      {/* 頂部 brand bar */}
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between border-b border-fg3/20">
        <button
          onClick={reset}
          className="font-display font-semibold text-lg tracking-[4px] uppercase hover:opacity-80 transition"
        >
          <span className="text-accent">Lobster</span>{" "}
          <span className="text-fg">Studio</span>
          <span className="ml-3 text-xs font-mono text-fg3 tracking-normal normal-case">
            POC
          </span>
        </button>
        {mode !== "landing" && (
          <button
            onClick={reset}
            className="text-sm font-mono text-fg2 hover:text-accent transition"
          >
            ← 重新開始
          </button>
        )}
      </header>

      <div className="px-6 md:px-12 py-8 md:py-12">
        {mode === "landing" && (
          <LandingScreen
            onPickChat={() => setMode("chat")}
            onPickUpload={() => setMode("upload")}
          />
        )}

        {mode === "chat" && (
          <ChatInterface
            accessKey={accessKey}
            onImagesReady={(urls) => {
              setCandidateUrls(urls);
              setMode("results");
            }}
          />
        )}

        {mode === "upload" && (
          <UploadArea
            accessKey={accessKey}
            onUploaded={(url) => {
              setSelectedDesignUrl(url);
              setMode("mockup");
            }}
          />
        )}

        {mode === "results" && (
          <GenerationResults
            urls={candidateUrls}
            onPick={(url) => {
              setSelectedDesignUrl(url);
              setMode("mockup");
            }}
            onRedo={() => setMode("chat")}
          />
        )}

        {mode === "mockup" && selectedDesignUrl && (
          <MockupPreview
            accessKey={accessKey}
            designUrl={selectedDesignUrl}
            onRedo={reset}
          />
        )}
      </div>
    </main>
  );
}
