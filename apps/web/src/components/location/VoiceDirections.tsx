import { useEffect, useRef, useState } from "react";

/**
 * VOICE DIRECTIONS — up to 30 seconds, recorded in the browser.
 *
 * Half of Lebanon has no usable street address. "Second left after the
 * pharmacy, blue gate, ring the top bell" is how people actually explain where
 * they live, and typing that into a notes field loses the part that matters —
 * the speaker's own words and emphasis. So the driver gets the recording.
 *
 * THE WAVEFORM IS REAL. It is sampled from an AnalyserNode on the live stream,
 * not a CSS animation. A fake waveform that moves while the microphone is
 * muted is worse than no waveform: it tells you recording is working at the
 * exact moment it is not.
 *
 * UNSUPPORTED IS A FIRST-CLASS STATE. iOS Safari below 14.3 has no
 * MediaRecorder at all, and a denied permission is a normal thing for someone
 * to choose. Both hide the control and print one grey line rather than
 * throwing, and the rest of the form carries on — this is optional.
 */

const MAX_SECONDS = 30;
/** 2MB. Roughly 8x what 30s of Opus needs, so it only ever catches a bug. */
const MAX_BYTES = 2 * 1024 * 1024;

export type VoiceRecording = { blob: Blob; seconds: number };

export function VoiceDirections({
  existingUrl,
  existingSeconds,
  onChange,
  onClearExisting,
}: {
  /** A signed URL for an already-saved recording, if this address has one. */
  existingUrl?: string | null;
  existingSeconds?: number | null;
  /** null clears the pending recording. */
  onChange: (rec: VoiceRecording | null) => void;
  /** Called when the user deletes a recording that is already saved. */
  onClearExisting?: () => void;
}) {
  const [supported, setSupported] = useState(true);
  const [denied, setDenied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [localSeconds, setLocalSeconds] = useState(0);
  const [tooBig, setTooBig] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  // Every one of these leaks something if it is skipped: the mic light stays
  // on, the AudioContext keeps a thread alive, the blob URL keeps its data.
  const teardown = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
  };

  useEffect(() => {
    return () => {
      teardown();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setTooBig(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const bins = new Uint8Array(analyser.frequencyBinCount);

      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const secs = Math.round((Date.now() - startedAt.current) / 1000);
        teardown();
        setRecording(false);
        if (blob.size > MAX_BYTES) {
          setTooBig(true);
          onChange(null);
          return;
        }
        if (localUrl) URL.revokeObjectURL(localUrl);
        setLocalUrl(URL.createObjectURL(blob));
        setLocalSeconds(secs);
        onChange({ blob, seconds: secs });
      };

      startedAt.current = Date.now();
      rec.start();
      setRecording(true);
      setSeconds(0);
      setLevels([]);

      const tick = () => {
        if (!recRef.current || recRef.current.state !== "recording") return;
        analyser.getByteFrequencyData(bins);
        // One number per frame: mean magnitude, normalised. Enough to draw a
        // bar that genuinely tracks the voice.
        const avg = bins.reduce((s, v) => s + v, 0) / bins.length / 255;
        setLevels((prev) => [...prev.slice(-39), avg]);

        const elapsed = (Date.now() - startedAt.current) / 1000;
        setSeconds(Math.floor(elapsed));
        if (elapsed >= MAX_SECONDS) {
          recRef.current.stop();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Denied, or no device. Either way the control goes away.
      setDenied(true);
      teardown();
    }
  }

  function stop() {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  function remove() {
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    setLocalSeconds(0);
    onChange(null);
    onClearExisting?.();
  }

  if (!supported || denied) {
    return (
      <p className="text-[13px] text-muted">
        Voice directions aren&rsquo;t available in this browser
      </p>
    );
  }

  const savedUrl = localUrl ?? existingUrl ?? null;
  const savedSeconds = localUrl ? localSeconds : (existingSeconds ?? 0);

  if (recording) {
    return (
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-pill bg-persimmon"
        />
        {/* 40 bars, each the level from one sampled frame. min-height 2px so a
            silent stretch reads as a flat line rather than a gap. */}
        <span aria-hidden className="flex h-6 min-w-0 flex-1 items-center gap-[2px]">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] shrink-0 rounded-pill bg-persimmon/70"
              style={{ height: `${Math.max(2, (levels[i] ?? 0) * 24)}px` }}
            />
          ))}
        </span>
        <span className="shrink-0 tabular-nums text-[13px] text-muted">
          0:{String(seconds).padStart(2, "0")} / 0:{MAX_SECONDS}
        </span>
        <button
          type="button"
          onClick={stop}
          className="shrink-0 rounded-pill bg-persimmon px-3 py-1.5 text-[13px] font-semibold text-white"
        >
          Stop
        </button>
      </div>
    );
  }

  if (savedUrl) {
    return (
      <div className="flex items-center gap-3">
        {/* The browser's own player. A custom one would be three more states
            to get wrong (buffering, seek, ended) for no gain at this size. */}
        <audio src={savedUrl} controls className="h-9 min-w-0 flex-1" />
        <span className="shrink-0 text-[13px] text-muted">0:{String(savedSeconds).padStart(2, "0")}</span>
        <button type="button" onClick={remove} className="shrink-0 text-[13px] font-semibold text-persimmon">
          Delete
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void start()}
        className="card-press flex w-full items-center gap-2.5 rounded-[12px] border border-line bg-white px-3 py-2.5 text-left"
      >
        <span aria-hidden className="text-[16px]">🎙️</span>
        <span className="text-[14px] font-medium text-ink">
          Tap to record directions · up to {MAX_SECONDS}s
        </span>
      </button>
      {tooBig ? (
        <p className="mt-1.5 text-[13px] text-persimmon">
          That recording was too large to save. Try a shorter one.
        </p>
      ) : null}
    </>
  );
}
