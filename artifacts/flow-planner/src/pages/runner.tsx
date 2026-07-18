import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetRoutine,
  useListPoses,
  useCreateSession,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Pause, SkipForward, SkipBack, X, Bell, BellOff, Check, Moon, Sun, Maximize2 } from "lucide-react";

// ── Flow Runner — single shared layout, dual theme via --runner-* tokens ────
// One 100dvh flex column with three anchored zones (top / middle / bottom).
// Colors live in index.css as --runner-* tokens; the top-bar toggle flips the
// app-wide .dark class on <html>, same as the rest of the app.

const FONT = '"Montserrat", system-ui, sans-serif';

// Single shared AudioContext. Mobile browsers create it "suspended" and it only
// makes sound after being resumed inside a user gesture (e.g. tapping Play).
let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!sharedAudioCtx) sharedAudioCtx = new AC();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Call inside a user gesture to unlock audio on mobile.
function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

// Short gong synth — a bright, sustained metallic strike that rings out and decays
function playChime() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;

    // A gong is a fundamental plus slightly inharmonic overtones ringing together.
    const fundamental = 196; // G3 — warm, resonant base
    const partials = [
      { ratio: 1, gain: 0.5 },
      { ratio: 2.01, gain: 0.28 },
      { ratio: 2.76, gain: 0.18 },
      { ratio: 3.98, gain: 0.12 },
      { ratio: 5.42, gain: 0.08 },
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(1, now + 0.005); // fast metallic attack
    master.gain.exponentialRampToValueAtTime(0.0001, now + 3.2); // long ring-out
    master.connect(ctx.destination);

    partials.forEach(({ ratio, gain }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      const freq = fundamental * ratio;
      osc.frequency.setValueAtTime(freq, now);
      // subtle downward shimmer as the metal settles
      osc.frequency.exponentialRampToValueAtTime(freq * 0.99, now + 3);
      g.gain.setValueAtTime(gain, now);
      // higher partials decay faster, like a real gong
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2 / ratio);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 3.4);
    });
  } catch (e) {
    // Ignore audio context errors
  }
}

const KEYFRAMES = (
  <style>{`
    @keyframes fp-halo { 0%,100% { transform: scale(.9); opacity: .5; } 50% { transform: scale(1.1); opacity: .85; } }
    @keyframes fp-breath-edge { 0%,100% { opacity: .5; } 50% { opacity: .1; } }
    @keyframes fp-breath-core { 0%,100% { opacity: 0; } 50% { opacity: .42; } }
    @keyframes fp-in  { 0%,44% { opacity: 1; } 54%,100% { opacity: 0; } }
    @keyframes fp-out { 0%,44% { opacity: 0; } 54%,100% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .fp-halo-pulse { animation: none !important; }
      .fp-breath-edge { animation: none !important; opacity: .4 !important; }
      .fp-breath-core { animation: none !important; opacity: 0 !important; }
    }
  `}</style>
);

export default function Runner() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: routine, isLoading: loadingRoutine } = useGetRoutine(Number(params.id));
  const { data: poses, isLoading: loadingPoses } = useListPoses();

  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const queryClient = useQueryClient();
  const { mutate: createSession } = useCreateSession();
  const savedRef = useRef(false);

  const wakeLockRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten routine into a linear sequence
  const sequence = useMemo(() => {
    if (!routine || !poses) return [];
    const poseMap = new Map(poses.map((p) => [p.id, p]));
    const buildEntries = (entries: any[], sectionName: string) => {
      const result: any[] = [];
      entries.forEach((entry) => {
        const pose = poseMap.get(entry.poseId);
        if (!pose) return;
        if (pose.perSide) {
          result.push({ ...entry, pose, sectionName, side: "Right side", duration: Math.max(1, Math.ceil(entry.durationSeconds / 2)) });
          result.push({ ...entry, pose, sectionName, side: "Left side", duration: Math.max(1, Math.floor(entry.durationSeconds / 2)) });
        } else {
          result.push({ ...entry, pose, sectionName, side: null, duration: entry.durationSeconds });
        }
      });
      return result;
    };
    return [
      ...buildEntries(routine.sections.centering, "Centering"),
      ...buildEntries(routine.sections.flow, "Flow"),
      ...buildEntries(routine.sections.closing, "Closing"),
    ];
  }, [routine, poses]);

  // WakeLock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && isPlaying) wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch (err) { console.warn("Wake lock failed", err); }
    };
    if (isPlaying) requestWakeLock();
    else if (wakeLockRef.current) wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
    return () => { if (wakeLockRef.current) wakeLockRef.current.release(); };
  }, [isPlaying]);

  // Init duration when index changes
  useEffect(() => {
    if (sequence.length > 0 && currentIndex < sequence.length) setTimeLeft(sequence[currentIndex].duration);
  }, [currentIndex, sequence]);

  // Close the image lightbox on each new pose
  useEffect(() => {
    setImageExpanded(false);
  }, [currentIndex]);

  // Timer tick
  useEffect(() => {
    if (isPlaying && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (chimeEnabled) playChime();
            if (currentIndex < sequence.length - 1) { setCurrentIndex((c) => c + 1); return 0; }
            setIsFinished(true); setIsPlaying(false); return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, isFinished, currentIndex, sequence.length, chimeEnabled]);

  // Record the completed session once
  useEffect(() => {
    if (isFinished && routine && !savedRef.current) {
      savedRef.current = true;
      createSession(
        {
          data: {
            routineId: routine.id,
            routineTitle: routine.title,
            totalSeconds: routine.totalSeconds,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          },
        },
      );
    }
  }, [isFinished, routine, createSession, queryClient]);

  const togglePlay = () => { unlockAudio(); setIsPlaying((p) => !p); };

  const handleSkipNext = () => {
    unlockAudio();
    if (currentIndex < sequence.length - 1) { setCurrentIndex((c) => c + 1); if (chimeEnabled) playChime(); }
    else { setIsFinished(true); setIsPlaying(false); }
  };
  const handleSkipBack = () => { if (currentIndex > 0) setCurrentIndex((c) => c - 1); };
  const toggleMode = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    setIsDark(next);
  };

  const rootStyle: React.CSSProperties = { background: "var(--runner-bg)", color: "var(--runner-text)", fontFamily: FONT, height: "100dvh" };

  if (loadingRoutine || loadingPoses)
    return <div className="fixed inset-0 flex items-center justify-center" style={{ ...rootStyle, color: "var(--runner-accent)" }}>Loading…</div>;
  if (!routine || !poses)
    return <div className="fixed inset-0 flex items-center justify-center" style={rootStyle}>Not found</div>;

  if (isFinished) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center animate-in fade-in zoom-in duration-500" style={rootStyle}>
        {KEYFRAMES}
        <div className="flex items-center justify-center rounded-full" style={{ width: 88, height: 88, background: "var(--runner-finish-halo)", color: "var(--runner-accent)" }}>
          <Check className="w-10 h-10" strokeWidth={1.6} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[26px] font-light">Session complete</h1>
          <p className="text-sm" style={{ opacity: 0.68 }}>{routine.title}</p>
          <p className="text-sm" style={{ opacity: 0.68 }}>{Math.round(routine.totalSeconds / 60)} minutes of practice · well done</p>
        </div>
        <button onClick={() => setLocation("/")} className="mt-2 px-8 py-3.5 rounded-full text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ background: "var(--runner-play-bg)", color: "var(--runner-play-text)" }}>
          Done
        </button>
      </div>
    );
  }

  if (sequence.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4" style={rootStyle}>
        <p>This routine has no poses.</p>
        <button onClick={() => setLocation("/")} className="px-6 py-2.5 rounded-full" style={{ background: "var(--runner-play-bg)", color: "var(--runner-play-text)" }}>Go back</button>
      </div>
    );
  }

  const e = sequence[currentIndex];
  const isBreaths = e.pose.durationType === "breaths";
  const mmss = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`;
  const safetyHasCautions = (e.pose.cautions?.length ?? 0) > 0;
  const safetyHasDetails = !!(e.pose.modification || e.pose.chairOption);
  const hasSafety = safetyHasCautions || safetyHasDetails;
  // Circular progress ring around the play/pause button (time remaining for this pose)
  const RING_SIZE = 88;
  const RING_STROKE = 3;
  const RING_R = (RING_SIZE - RING_STROKE) / 2;
  const RING_C = 2 * Math.PI * RING_R;
  const remainingFrac = e.duration > 0 ? Math.max(0, Math.min(1, timeLeft / e.duration)) : 0;
  // Fill the flow progress bar continuously — including during the final pose.
  const pct = Math.max(0, Math.min(100, ((currentIndex + 1 - remainingFrac) / sequence.length) * 100));
  const rawPoseImage: string | undefined = (e.pose as any).imageUrl ?? undefined;
  const poseImage: string | undefined = rawPoseImage
    ? (/^https?:\/\//.test(rawPoseImage) ? rawPoseImage : `/api/storage${rawPoseImage}`)
    : undefined;

  // ── Shared fragments ──────────────────────────────────────────────────────
  const BreathGlow = (
    <>
      {/* exhale — breath out to the corners (edge vignette, peaks at rest) */}
      <div
        className="fixed inset-0 pointer-events-none fp-breath-edge"
        aria-hidden="true"
        style={{
          zIndex: -1,
          background: "var(--runner-breath-glow)",
          opacity: 0.5,
          animation: "fp-breath-edge 8s ease-in-out infinite",
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      />
      {/* inhale — breath drawn into the center (soft central bloom, peaks mid-cycle) */}
      <div
        className="fixed inset-0 pointer-events-none fp-breath-core"
        aria-hidden="true"
        style={{
          zIndex: -1,
          background: "var(--runner-breath-core)",
          opacity: 0,
          animation: "fp-breath-core 8s ease-in-out infinite",
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      />
    </>
  );

  const TopBar = (
    <div className="flex items-center justify-between shrink-0">
      <button onClick={() => setLocation(`/routines/${routine.id}`)} className="p-1.5 -ml-1.5 opacity-60">
        <X className="w-5 h-5" strokeWidth={1.7} />
      </button>
      <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--runner-accent)" }}>{e.sectionName}</div>
      <div className="flex items-center gap-1">
        <button onClick={toggleMode} className="p-1.5 opacity-60" title="Toggle theme">
          {isDark ? <Sun className="w-5 h-5" strokeWidth={1.6} /> : <Moon className="w-5 h-5" strokeWidth={1.6} />}
        </button>
        <button onClick={() => setChimeEnabled(!chimeEnabled)} className="p-1.5 -mr-1.5" style={{ opacity: chimeEnabled ? 0.7 : 0.4 }}>
          {chimeEnabled ? <Bell className="w-5 h-5" strokeWidth={1.6} /> : <BellOff className="w-5 h-5" strokeWidth={1.6} />}
        </button>
      </div>
    </div>
  );

  const Caption = (
    <div className="relative" style={{ width: 150, height: 16 }}>
      <span className="absolute inset-0 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--runner-text)", opacity: 0.55, animation: "fp-in 8s ease-in-out infinite", animationPlayState: isPlaying ? "running" : "paused" }}>Inhale</span>
      <span className="absolute inset-0 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--runner-text)", opacity: 0.55, animation: "fp-out 8s ease-in-out infinite", animationPlayState: isPlaying ? "running" : "paused" }}>Exhale</span>
    </div>
  );

  // Safety — always expanded. Cautions stay compact pills (1-2 words); the
  // modification & chair sentences render as plain left-aligned text lines.
  const Safety = hasSafety ? (
    <div className="flex flex-col items-stretch gap-2 w-full" style={{ maxWidth: 320 }}>
      {safetyHasCautions && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {e.pose.cautions?.map((c: string) => (
            <span key={c} className="text-[10.5px] font-medium px-2.5 py-[5px] rounded-lg" style={{ background: "var(--runner-caution-bg)", color: "var(--runner-caution-text)", border: "var(--runner-caution-border)" }}>Caution · {c}</span>
          ))}
        </div>
      )}
      {safetyHasDetails && (
        <div className="flex flex-col gap-1 text-left">
          {e.pose.modification && (
            <p className="text-[13.5px] leading-[1.4]" style={{ color: "var(--runner-text)", opacity: 0.85 }}>
              <span className="font-bold">Mod — </span>{e.pose.modification}
            </p>
          )}
          {e.pose.chairOption && (
            <p className="text-[13.5px] leading-[1.4]" style={{ color: "var(--runner-text)", opacity: 0.85 }}>
              <span className="font-bold">Chair — </span>{e.pose.chairOption}
            </p>
          )}
        </div>
      )}
    </div>
  ) : null;

  const Controls = (
    <div className="flex flex-col gap-3 shrink-0">
      <div className="text-center text-[40px] font-light tabular-nums leading-none" style={{ color: "var(--runner-timer-color)" }}>{mmss}</div>
      <div className="flex items-center justify-center gap-9">
        <button aria-label="Previous pose" onClick={handleSkipBack} disabled={currentIndex === 0} className="p-2 opacity-60 disabled:opacity-25 transition-opacity">
          <SkipBack className="fill-current" style={{ width: 26, height: 26 }} />
        </button>
        <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <div className="fp-halo-pulse absolute rounded-full" style={{ inset: 7, background: "var(--runner-ring-glow)", animation: "fp-halo 8s ease-in-out infinite", animationPlayState: isPlaying ? "running" : "paused" }} />
          <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="var(--runner-progress-track)" strokeWidth={RING_STROKE} />
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="var(--runner-accent)" strokeWidth={RING_STROKE} strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - remainingFrac)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <button aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} className="relative flex items-center justify-center rounded-full active:scale-95 transition-transform"
                  style={{ width: 74, height: 74, background: "var(--runner-play-bg)", color: "var(--runner-play-text)", boxShadow: "var(--runner-play-shadow)" }}>
            {isPlaying ? <Pause className="fill-current" style={{ width: 26, height: 26 }} /> : <Play className="fill-current" style={{ width: 28, height: 28, marginLeft: 3 }} />}
          </button>
        </div>
        <button aria-label="Next pose" onClick={handleSkipNext} className="p-2 opacity-60 transition-opacity">
          <SkipForward className="fill-current" style={{ width: 26, height: 26 }} />
        </button>
      </div>
      <div className="flex flex-col gap-2 px-1">
        <div className="flex justify-between text-[11px] font-medium tracking-[0.06em]" style={{ opacity: 0.55 }}>
          <span>Pose {currentIndex + 1} / {sequence.length}</span>
          <span>{Math.round(routine.totalSeconds / 60)} min flow</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 5, background: "var(--runner-progress-track)" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--runner-accent)", borderRadius: 999, transition: "width .8s linear" }} />
        </div>
      </div>
    </div>
  );

  const Lightbox = imageExpanded && poseImage ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(2,2,2,0.85)", backdropFilter: "blur(4px)" }}
      onClick={() => setImageExpanded(false)}
      role="dialog"
      aria-modal="true"
    >
      <img
        src={poseImage}
        alt={e.pose.name}
        className="max-w-full max-h-full object-contain rounded-2xl"
        style={{ boxShadow: "0 24px 70px rgba(2,2,2,0.55)" }}
        onClick={(ev) => ev.stopPropagation()}
      />
      <button
        aria-label="Close image"
        onClick={() => setImageExpanded(false)}
        className="absolute top-5 right-5 p-2 rounded-full"
        style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}
      >
        <X className="w-5 h-5" strokeWidth={1.8} />
      </button>
    </div>
  ) : null;

  // ── Unified layout — three anchored zones (colors from --runner-* tokens) ──
  return (
    <div className="fixed inset-x-0 top-0 overflow-hidden flex flex-col px-6 pt-7 pb-8" style={rootStyle}>
      {KEYFRAMES}
      {BreathGlow}

      {/* TOP ZONE — anchored: top bar + pose name (with optional thumbnail & side badge) */}
      <div className="shrink-0 flex flex-col gap-4">
        {TopBar}
        <div className="flex items-center gap-3.5">
          {poseImage && (
            <button
              onClick={() => setImageExpanded(true)}
              className="relative shrink-0 overflow-hidden rounded-2xl"
              style={{ height: 72, boxShadow: "var(--runner-tile-shadow)", cursor: "zoom-in" }}
              aria-label="Expand pose image"
            >
              <img
                src={poseImage}
                alt={e.pose.name}
                className="block rounded-2xl"
                style={{ height: 72, width: "auto", maxWidth: 140, objectFit: "contain" }}
              />
              <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded" style={{ background: "rgba(2,2,2,0.38)" }}>
                <Maximize2 className="w-3 h-3 text-white" strokeWidth={2} />
              </div>
            </button>
          )}
          <div className="flex flex-col gap-1.5 min-w-0">
            <h2 className="text-[28px] font-light leading-[1.12]" style={{ color: "var(--runner-heading)" }}>{e.pose.name}</h2>
            {e.side && (
              <span className="self-start text-[11px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full" style={{ background: "var(--runner-side-badge-bg)", color: "var(--runner-side-badge-text)" }}>{e.side}</span>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE ZONE — flex-1, scrollable, content vertically centered */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center">
        <div className="my-auto w-full flex flex-col items-center gap-4 py-5 text-center">
          <div className="flex flex-col items-center gap-1.5">
            {Caption}
            {isBreaths && e.breaths && (
              <span className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ opacity: 0.5 }}>{e.breaths} breaths</span>
            )}
          </div>
          {e.pose.cue && (
            <p className="font-normal" style={{ fontSize: 17.5, lineHeight: 1.5, opacity: 0.92, maxWidth: 320, color: "var(--runner-text)" }}>{e.pose.cue}</p>
          )}
          {Safety}
        </div>
      </div>

      {/* BOTTOM ZONE — anchored: timer + controls + progress */}
      {Controls}
      {Lightbox}
    </div>
  );
}
