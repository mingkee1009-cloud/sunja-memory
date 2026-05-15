"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Web Speech API 타입 선언 (lib.dom에 미포함) ───────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ── 타입 ─────────────────────────────────────────────────────
export type VoiceState = "idle" | "listening" | "error";

export interface UseVoiceMemoReturn {
  voiceState: VoiceState;
  interimText: string;   // 인식 중 실시간 텍스트
  finalText: string;     // 인식 완료 확정 텍스트
  errorMsg: string;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// ── 훅 ───────────────────────────────────────────────────────
export function useVoiceMemo(): UseVoiceMemoReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // ⬇ 초기값 false — 서버/클라이언트 초기 렌더를 동일하게 유지
  const [isSupported, setIsSupported] = useState(false);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);

  // 브라우저 마운트 후에만 window에 접근
  useEffect(() => {
    setIsSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  // 인식기 초기화 (isSupported가 true인 마운트 이후에만 실제 동작)
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const recog = new SR();

    recog.lang = "ko-KR";
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      setVoiceState("listening");
      setErrorMsg("");
    };

    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
      if (final) {
        setFinalText((prev) => (prev ? prev + " " + final : final).trim());
      }
    };

    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      const messages: Record<string, string> = {
        "not-allowed": "마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.",
        "no-speech":   "음성이 감지되지 않았어요. 다시 시도해보세요.",
        "network":     "네트워크 오류가 발생했어요.",
        "aborted":     "",
      };
      const msg = messages[e.error] ?? `음성 인식 오류: ${e.error}`;
      if (msg) {
        setErrorMsg(msg);
        setVoiceState("error");
      }
    };

    recog.onend = () => {
      setInterimText("");
      setVoiceState("idle");
    };

    return recog;
  }, [isSupported]);

  const start = useCallback(() => {
    if (recogRef.current) {
      recogRef.current.abort();
    }
    const recog = initRecognition();
    if (!recog) return;
    recogRef.current = recog;
    setFinalText("");
    setInterimText("");
    setErrorMsg("");
    try {
      recog.start();
    } catch {
      setErrorMsg("음성 인식을 시작할 수 없어요.");
      setVoiceState("error");
    }
  }, [initRecognition]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recogRef.current?.abort();
    setFinalText("");
    setInterimText("");
    setErrorMsg("");
    setVoiceState("idle");
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      recogRef.current?.abort();
    };
  }, []);

  return {
    voiceState,
    interimText,
    finalText,
    errorMsg,
    isSupported,
    start,
    stop,
    reset,
  };
}
