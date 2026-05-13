"use client";

import { useState } from "react";
import LandingScreen from "./components/LandingScreen";
import IntakeForm, { type IntakeAnswers } from "./components/IntakeForm";
import ChatInterface from "./components/ChatInterface";
import UploadArea from "./components/UploadArea";
import GenerationResults from "./components/GenerationResults";
import MockupPreview from "./components/MockupPreview";
import { seedMessagesFromIntake, type Msg } from "@/lib/poc/chatSeed";

type Mode = "landing" | "intake" | "chat" | "upload" | "results" | "mockup";

interface Props {
  accessKey: string;
}

export default function StudioClient({ accessKey }: Props) {
  const [mode, setMode] = useState<Mode>("landing");
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(null);
  // 對話歷史 hoist 到此層，這樣「重新對話」回 chat 才不會被 ChatInterface 重置
  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  const [selectedDesignUrl, setSelectedDesignUrl] = useState<string | null>(null);

  function fullReset() {
    setMode("landing");
    setIntakeAnswers(null);
    setChatMessages([]);
    setCandidateUrls([]);
    setSelectedDesignUrl(null);
  }

  function handleIntakeComplete(answers: IntakeAnswers) {
    setIntakeAnswers(answers);
    setChatMessages(seedMessagesFromIntake(answers));  // 新對話 → 從 intake seed
    setMode("chat");
  }

  function handleRedoFromResults() {
    // 「都不滿意，重新對話」→ 回 chat、**保留對話歷史**
    // append 一句 AI 過渡訊息讓客戶知道從哪接續
    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "想改哪裡呢？告訴我具體想調整的點（例如「狗的毛色換成白的」「加上太陽眼鏡」），我重新畫一張 ✨\n\n或直接按下方紅色「不囉嗦了直接生圖」也行。",
      },
    ]);
    setMode("chat");
  }

  // intake 偏好顏色 → mockup 預覽預設顏色
  const preferredColorId =
    intakeAnswers?.shirtColor === "black" ? "black" : "white";

  return (
    <main className="min-h-screen bg-bg text-fg">
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between border-b border-fg3/20">
        <button
          onClick={fullReset}
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
            onClick={fullReset}
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
          <IntakeForm onComplete={handleIntakeComplete} />
        )}

        {mode === "chat" && intakeAnswers && (
          <ChatInterface
            accessKey={accessKey}
            intake={intakeAnswers}
            messages={chatMessages}
            setMessages={setChatMessages}
            onImagesReady={(urls) => {
              setCandidateUrls(urls);
              setMode("results");
            }}
            onResetAll={fullReset}
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
            onRedo={handleRedoFromResults}
          />
        )}

        {mode === "mockup" && selectedDesignUrl && (
          <MockupPreview
            accessKey={accessKey}
            designUrl={selectedDesignUrl}
            defaultColorId={preferredColorId}
            onRedo={fullReset}
          />
        )}
      </div>
    </main>
  );
}
