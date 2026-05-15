"use client";

import { useState } from "react";
import LandingScreen from "./components/LandingScreen";
import IntakeForm, { type IntakeAnswers } from "./components/IntakeForm";
import ChatInterface from "./components/ChatInterface";
import UploadArea from "./components/UploadArea";
import GenerationResults from "./components/GenerationResults";
import DesignEditor from "./components/DesignEditor";
import TextDesignPicker from "./components/TextDesignPicker";
import MockupPreview from "./components/MockupPreview";
import { seedMessagesFromIntake, type Msg } from "@/lib/poc/chatSeed";

type Mode =
  | "landing"
  | "intake"
  | "chat"
  | "upload"
  | "text-design"  // Path C
  | "results"      // Path A 第一次 3 候選選擇
  | "editor"       // 設計編輯器 hub
  | "mockup";

interface Props {
  accessKey: string;
}

export default function StudioClient({ accessKey }: Props) {
  const [mode, setMode] = useState<Mode>("landing");
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(null);
  // 對話歷史 hoist 到此層，這樣「重新對話」回 chat 才不會被 ChatInterface 重置
  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [candidateUrls, setCandidateUrls] = useState<string[]>([]);
  // 進入 editor 時的 design URL（從 results 選一張、或 upload 完直接帶來）
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  // 編輯器確認後 → mockup 的最終 design URL
  const [selectedDesignUrl, setSelectedDesignUrl] = useState<string | null>(null);
  // 從哪條路徑進編輯器（決定「重做」按鈕往回去哪）
  const [editorSource, setEditorSource] = useState<"chat" | "upload" | null>(null);

  function fullReset() {
    setMode("landing");
    setIntakeAnswers(null);
    setChatMessages([]);
    setCandidateUrls([]);
    setEditorImageUrl(null);
    setSelectedDesignUrl(null);
    setEditorSource(null);
  }

  function handleIntakeComplete(answers: IntakeAnswers) {
    setIntakeAnswers(answers);
    setChatMessages(seedMessagesFromIntake(answers));
    setMode("chat");
  }

  function handleRedoFromResults() {
    // 「都不滿意，重新對話」→ 回 chat、保留對話歷史
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

  // 編輯器「重做」按鈕：依 editorSource 決定回哪
  function handleEditorBack() {
    if (editorSource === "chat") {
      handleRedoFromResults();
    } else if (editorSource === "upload") {
      setMode("upload");
    } else {
      setMode("landing");
    }
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
            onPickText={() => setMode("text-design")}
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
              // 上傳完進編輯器（不直接跳 mockup），客戶可選「直接用」或「AI 改圖」
              setEditorImageUrl(url);
              setEditorSource("upload");
              setMode("editor");
            }}
          />
        )}

        {mode === "text-design" && (
          <TextDesignPicker
            accessKey={accessKey}
            onComplete={(url) => {
              // 純文字設計直接跳 mockup（不過編輯器，因為文字不該 AI 改）
              setSelectedDesignUrl(url);
              setMode("mockup");
            }}
            onBack={() => setMode("landing")}
          />
        )}

        {mode === "results" && (
          <GenerationResults
            urls={candidateUrls}
            onPick={(url) => {
              // 選完 3 候選 → 進編輯器（可繼續修或直接到 mockup）
              setEditorImageUrl(url);
              setEditorSource("chat");
              setMode("editor");
            }}
            onRedo={handleRedoFromResults}
          />
        )}

        {mode === "editor" && editorImageUrl && (
          <DesignEditor
            accessKey={accessKey}
            initialImageUrl={editorImageUrl}
            onProceed={(finalUrl) => {
              setSelectedDesignUrl(finalUrl);
              setMode("mockup");
            }}
            onBack={handleEditorBack}
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
