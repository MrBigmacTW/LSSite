"use client";

import { useState } from "react";
import LandingScreen from "./components/LandingScreen";
import IntakeForm, { type IntakeAnswers } from "./components/IntakeForm";
import ChatInterface from "./components/ChatInterface";
import UploadArea from "./components/UploadArea";
import GenerationResults from "./components/GenerationResults";
import MockupPreview from "./components/MockupPreview";

type Mode = "landing" | "intake" | "chat" | "upload" | "results" | "mockup";

interface Props {
  accessKey: string;
}

export default function StudioClient({ accessKey }: Props) {
  const [mode, setMode] = useState<Mode>("landing");
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(null);
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [selectedDesignUrl, setSelectedDesignUrl] = useState<string | null>(null);

  function reset() {
    setMode("landing");
    setIntakeAnswers(null);
    setCandidateUrls([]);
    setSelectedDesignUrl(null);
  }

  // 將 intake 對應到 mockup 預設顏色（用戶選白 T → 預覽預設白 T，黑 T 同理）
  const preferredColorId =
    intakeAnswers?.shirtColor === "black" ? "black" : "white";

  return (
    <main className="min-h-screen bg-bg text-fg">
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
            onPickChat={() => setMode("intake")}
            onPickUpload={() => setMode("upload")}
          />
        )}

        {mode === "intake" && (
          <IntakeForm
            onComplete={(answers) => {
              setIntakeAnswers(answers);
              setMode("chat");
            }}
          />
        )}

        {mode === "chat" && intakeAnswers && (
          <ChatInterface
            accessKey={accessKey}
            intake={intakeAnswers}
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
            defaultColorId={preferredColorId}
            onRedo={reset}
          />
        )}
      </div>
    </main>
  );
}
