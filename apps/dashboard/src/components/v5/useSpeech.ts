"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech in and speech out for the assistant (V5 §1.15), using only what the
 * browser already has — no service, no key, no audio leaves the machine.
 *
 * Support is genuinely uneven: Chrome and Edge have SpeechRecognition behind
 * the webkit prefix, Firefox has none. `supported` is false there and the
 * caller HIDES the mic rather than showing a button that does nothing — a dead
 * control is worse than a missing one.
 */

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type SpeechLang = "en-US" | "ar-LB";

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState<SpeechLang>("en-US");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // Kept in a ref so a re-render mid-utterance cannot lose the transcript.
  const finalRef = useRef("");

  useEffect(() => {
    const w = window as WindowWithSpeech;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const w = window as WindowWithSpeech;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    setError(null);
    finalRef.current = "";
    setInterim("");

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      finalRef.current = text;
      setInterim(text);
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are the user saying nothing or changing their
      // mind — not failures worth shouting about.
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        setError(e.error === "not-allowed" ? "Microphone permission was refused." : "Couldn't hear that.");
      }
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      setInterim("");
      // Auto-send when the speaker stops, which is the point of dictating.
      if (text) onFinal(text);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang, onFinal]);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, interim, lang, setLang, start, stop, error };
}

/**
 * Reading answers aloud. Default OFF, and remembered — a dashboard that starts
 * talking unprompted is a dashboard someone mutes forever.
 */
export function useSpeaker() {
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    try {
      setOn(localStorage.getItem("cado-speak") === "1");
    } catch {
      /* private mode */
    }
  }, []);

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem("cado-speak", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!on || !("speechSynthesis" in window)) return;
      // Strip markdown table pipes — read aloud they are noise.
      const clean = text.replace(/\|/g, " ").replace(/-{2,}/g, " ").slice(0, 600);
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [on]
  );

  return { on, toggle, say, supported };
}
