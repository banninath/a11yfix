import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
}

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [state, setState] = useState<SpeechState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synthesis = window.speechSynthesis;
    const updateState = () => {
      setState({
        isSpeaking: synthesis.speaking,
        isPaused: synthesis.paused,
        isSupported: true,
      });
    };

    const frame = window.requestAnimationFrame(updateState);
    synthesis.addEventListener("start", updateState);
    synthesis.addEventListener("end", updateState);
    synthesis.addEventListener("pause", updateState);
    synthesis.addEventListener("resume", updateState);
    synthesis.addEventListener("voiceschanged", updateState);

    return () => {
      window.cancelAnimationFrame(frame);
      utteranceRef.current = null;
      synthesis.removeEventListener("start", updateState);
      synthesis.removeEventListener("end", updateState);
      synthesis.removeEventListener("pause", updateState);
      synthesis.removeEventListener("resume", updateState);
      synthesis.removeEventListener("voiceschanged", updateState);
      synthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !text.trim()
    ) {
      return;
    }

    const synthesis = window.speechSynthesis;
    utteranceRef.current = null;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    const englishVoice = synthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase() === "en-us");
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    const finishUtterance = () => {
      if (utteranceRef.current !== utterance) {
        return;
      }
      utteranceRef.current = null;
      setState({ isSpeaking: false, isPaused: false, isSupported: true });
      onEnd?.();
    };

    utterance.onstart = () => {
      if (utteranceRef.current === utterance) {
        setState({ isSpeaking: true, isPaused: false, isSupported: true });
      }
    };
    utterance.onend = finishUtterance;
    utterance.onerror = finishUtterance;

    setState({ isSpeaking: true, isPaused: false, isSupported: true });
    synthesis.speak(utterance);
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setState((current) =>
        current.isSpeaking
          ? { ...current, isPaused: true }
          : current
      );
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setState((current) =>
        current.isSpeaking
          ? { ...current, isPaused: false }
          : current
      );
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
      setState((current) => ({
        ...current,
        isSpeaking: false,
        isPaused: false,
      }));
    }
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking: state.isSpeaking,
    isPaused: state.isPaused,
    isSupported: state.isSupported,
  };
}
