import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetRoutine,
  useListPoses,
  useCreateSession,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Pause, SkipForward, SkipBack, X, Bell, BellOff, Check, Moon, Sun } from "lucide-react";

// ── Flow Runner — dual theme ────────────────────────────────────────────────
//  • dark  = "Still Water"  (1A layout: small pose tile + breathing ring timer)
//  • light = "Warm Studio"  (1B layout: large pose card + breathing orb timer)
// Toggle sits in the top bar; the choice persists in localStorage.

const FONT = '"Montserrat", system-ui, sans-serif';

const THEME = {
  dark: {
    bg: "radial-gradient(135% 80% at 50% -8%, #22383c 0%, #10201f 52%, #0a1414 100%)",
    text: "#e9f2ee",
    accent: "#8fd3c4",
    playBg: "#eef6f3",
    playText: "#0f201f",
    playShadow: "0 10px 30px -8px rgba(143,211,196,.5)",
    progressTrack: "rgba(233,242,238,.14)",
    cautionBg: "rgba(214,120,90,.2)",
    cautionText: "#f2c3b0",
    chipBg: "rgba(233,242,238,.1)",
    chipText: "rgba(233,242,238,.8)",
    chipBorder: "transparent",
    finishHalo: "rgba(143,211,196,.14)",
  },
  light: {
    bg: "radial-gradient(120% 68% at 50% 2%, #fcf5ec 0%, #f2e7d7 58%, #ecdfcb 100%)",
    text: "#322c26",
    accent: "#c26744",
    playBg: "#c26744",
    playText: "#ffffff",
    playShadow: "0 12px 28px -8px rgba(194,103,68,.6)",
    progressTrack: "rgba(50,44,38,.12)",
    cautionBg: "rgba(194,103,68,.13)",
    cautionText: "#a4522f",
    chipBg: "transparent",
    chipText: "rgba(50,44,38,.7)",
    chipBorder: "1px solid rgba(50,44,38,.15)",
    finishHalo: "rgba(194,103,68,.14)",
  },
};

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
    @keyframes fp-breathe { 0% { transform: scale(.78); } 50% { transform: scale(1.06); } 100% { transform: scale(.78); } }
    @keyframes fp-in  { 0%,44% { opacity: 1; } 54%,100% { opacity: 0; } }
    @keyframes fp-out { 0%,44% { opacity: 0; } 54%,100% { opacity: 1; } }
  `}</style>
);

export default function Runner() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: routine, isLoading: loadingRoutine } = useGetRoutine(Number(params.id));
  const { data: poses, isLoading: loadingPoses } = useListPoses();

  const [mode, setMode] = useState<"dark" | "light">(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("flowRunnerTheme") === "light" ? "light" : "dark")
  );
  useEffect(() => { try { localStorage.setItem("flowRunnerTheme", mode); } catch {} }, [mode]);
  const t = THEME[mode];

  const [isPlaying, setIsPlaying] = useState(false);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

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
  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  const rootStyle: React.CSSProperties = { background: t.bg, color: t.text, fontFamily: FONT, height: "100dvh" };

  if (loadingRoutine || loadingPoses)
    return <div className="fixed inset-0 flex items-center justify-center" style={{ ...rootStyle, color: t.accent }}>Loading…</div>;
  if (!routine || !poses)
    return <div className="fixed inset-0 flex items-center justify-center" style={rootStyle}>Not found</div>;

  if (isFinished) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center animate-in fade-in zoom-in duration-500" style={rootStyle}>
        {KEYFRAMES}
        <div className="flex items-center justify-center rounded-full" style={{ width: 88, height: 88, background: t.finishHalo, color: t.accent }}>
          <Check className="w-10 h-10" strokeWidth={1.6} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[26px] font-light">Session complete</h1>
          <p className="text-sm" style={{ opacity: 0.68 }}>{routine.title}</p>
          <p className="text-sm" style={{ opacity: 0.68 }}>{Math.round(routine.totalSeconds / 60)} minutes of practice · well done</p>
        </div>
        <button onClick={() => setLocation("/")} className="mt-2 px-8 py-3.5 rounded-full text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ background: t.playBg, color: t.playText }}>
          Done
        </button>
      </div>
    );
  }

  if (sequence.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4" style={rootStyle}>
        <p>This routine has no poses.</p>
        <button onClick={() => setLocation("/")} className="px-6 py-2.5 rounded-full" style={{ background: t.playBg, color: t.playText }}>Go back</button>
      </div>
    );
  }

  const e = sequence[currentIndex];
  const pct = (currentIndex / sequence.length) * 100;
  const isBreaths = e.pose.durationType === "breaths";
  const mmss = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`;
  const hasSafety = (e.pose.cautions?.length > 0) || e.pose.modification || e.pose.chairOption;
  const poseImage: string | undefined = (e.pose as any).imageUrl;

  // ── Shared fragments ──────────────────────────────────────────────────────
  const TopBar = (
    <div className="flex items-center justify-between shrink-0">
      <button onClick={() => setLocation(`/routines/${routine.id}`)} className="p-1.5 -ml-1.5 opacity-60">
        <X className="w-5 h-5" strokeWidth={1.7} />
      </button>
      <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: t.accent }}>{e.sectionName}</div>
      <div className="flex items-center gap-1">
        <button onClick={toggleMode} className="p-1.5 opacity-60" title="Toggle theme">
          {mode === "dark" ? <Sun className="w-5 h-5" strokeWidth={1.6} /> : <Moon className="w-5 h-5" strokeWidth={1.6} />}
        </button>
        <button onClick={() => setChimeEnabled(!chimeEnabled)} className="p-1.5 -mr-1.5" style={{ opacity: chimeEnabled ? 0.7 : 0.4 }}>
          {chimeEnabled ? <Bell className="w-5 h-5" strokeWidth={1.6} /> : <BellOff className="w-5 h-5" strokeWidth={1.6} />}
        </button>
      </div>
    </div>
  );

  const Caption = (
    <div className="relative" style={{ width: 150, height: 16 }}>
      <span className="absolute inset-0 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: t.text, opacity: 0.55, animation: "fp-in 8s ease-in-out infinite" }}>Inhale</span>
      <span className="absolute inset-0 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: t.text, opacity: 0.55, animation: "fp-out 8s ease-in-out infinite" }}>Exhale</span>
    </div>
  );

  const Safety = hasSafety ? (
    <div className="flex flex-wrap gap-1.5 justify-center mb-5 shrink-0">
      {e.pose.cautions?.map((c: string) => (
        <span key={c} className="text-[10.5px] font-medium px-2.5 py-[5px] rounded-lg" style={{ background: t.cautionBg, color: t.cautionText, border: mode === "light" ? "1px solid rgba(194,103,68,.25)" : "none" }}>Caution · {c}</span>
      ))}
      {e.pose.modification && <span className="text-[10.5px] font-medium px-2.5 py-[5px] rounded-lg" style={{ background: t.chipBg, color: t.chipText, border: t.chipBorder }}>Mod · {e.pose.modification}</span>}
      {e.pose.chairOption && <span className="text-[10.5px] font-medium px-2.5 py-[5px] rounded-lg" style={{ background: t.chipBg, color: t.chipText, border: t.chipBorder }}>Chair · {e.pose.chairOption}</span>}
    </div>
  ) : null;

  const Controls = (
    <div className="flex flex-col gap-5 shrink-0">
      <div className="flex items-center justify-center gap-9">
        <button aria-label="Previous pose" onClick={handleSkipBack} disabled={currentIndex === 0} className="p-2 opacity-60 disabled:opacity-25 transition-opacity">
          <SkipBack className="fill-current" style={{ width: 26, height: 26 }} />
        </button>
        <button aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{ width: 74, height: 74, background: t.playBg, color: t.playText, boxShadow: t.playShadow }}>
          {isPlaying ? <Pause className="fill-current" style={{ width: 26, height: 26 }} /> : <Play className="fill-current" style={{ width: 28, height: 28, marginLeft: 3 }} />}
        </button>
        <button aria-label="Next pose" onClick={handleSkipNext} className="p-2 opacity-60 transition-opacity">
          <SkipForward className="fill-current" style={{ width: 26, height: 26 }} />
        </button>
      </div>
      <div className="flex flex-col gap-2 px-1">
        <div className="flex justify-between text-[11px] font-medium tracking-[0.06em]" style={{ opacity: 0.55 }}>
          <span>Pose {currentIndex + 1} / {sequence.length}</span>
          <span>{Math.round(routine.totalSeconds / 60)} min flow</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 5, background: t.progressTrack }}>
          <div style={{ width: `${pct}%`, height: "100%", background: t.accent, borderRadius: 999, transition: "width .8s linear" }} />
        </div>
      </div>
    </div>
  );

  const ringLayer: React.CSSProperties = { position: "absolute", borderRadius: "50%", animation: "fp-breathe 8s ease-in-out infinite" };

  // ── DARK layout (1A · Still Water) ────────────────────────────────────────
  if (mode === "dark") {
    return (
      <div className="fixed inset-x-0 top-0 overflow-hidden flex flex-col px-6 pt-7 pb-8" style={rootStyle}>
        {KEYFRAMES}
        {TopBar}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-5 text-center py-4">
          <div className="relative overflow-hidden shrink-0" style={{ width: 150, height: 120, borderRadius: 20, boxShadow: "0 0 0 1px rgba(143,211,196,.18)",
               background: poseImage ? `center/cover url(${poseImage})` : "linear-gradient(160deg,#2c4a4c,#16292a)" }}>
            {!poseImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-[40px] font-light leading-none" style={{ color: "rgba(143,211,196,.85)" }}>{e.pose.name?.[0]}</span>
                <span className="text-[9px] font-medium uppercase tracking-[0.18em]" style={{ color: "rgba(143,211,196,.5)" }}>{e.pose.category}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2.5">
            <h2 className="text-[30px] font-light leading-[1.15]">{e.pose.name}</h2>
            {e.side && <span className="text-[11px] font-semibold uppercase tracking-[0.22em] px-3 py-[5px] rounded-full" style={{ background: t.accent, color: "#0f1f1e" }}>{e.side}</span>}
          </div>
          <div className="relative flex items-center justify-center" style={{ width: 186, height: 186 }}>
            <div style={{ ...ringLayer, inset: 0, border: "1px solid rgba(143,211,196,.22)" }} />
            <div style={{ ...ringLayer, inset: 26, border: "1px solid rgba(143,211,196,.42)" }} />
            <div style={{ ...ringLayer, inset: 48, background: "radial-gradient(circle, rgba(143,211,196,.16), transparent 72%)" }} />
            <div className="relative text-[50px] font-light tabular-nums" style={{ color: "#f2fbf7" }}>{mmss}</div>
          </div>
          {Caption}
          {isBreaths && e.breaths && <span className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ opacity: 0.5 }}>{e.breaths} breaths</span>}
          {e.pose.cue && <p className="italic font-light leading-[1.55] text-[15px]" style={{ maxWidth: 280, opacity: 0.8 }}>{e.pose.cue}</p>}
        </div>
        {Safety}
        {Controls}
      </div>
    );
  }

  // ── LIGHT layout (1B · Warm Studio) ───────────────────────────────────────
  return (
    <div className="fixed inset-x-0 top-0 overflow-hidden flex flex-col px-6 pt-6 pb-8" style={rootStyle}>
      {KEYFRAMES}
      {TopBar}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-4 text-center py-4">
        {/* large pose card with name overlay */}
        <div className="relative overflow-hidden shrink-0" style={{ width: 168, height: 134, borderRadius: 22, boxShadow: "0 14px 32px -18px rgba(120,90,60,.5)",
             background: poseImage ? `center/cover url(${poseImage})` : "linear-gradient(150deg,#e6b48f,#c98a63)" }}>
          {!poseImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-[42px] font-light leading-none" style={{ color: "rgba(253,247,239,.9)" }}>{e.pose.name?.[0]}</span>
              <span className="text-[9px] font-medium uppercase tracking-[0.18em]" style={{ color: "rgba(253,247,239,.65)" }}>{e.pose.category}</span>
            </div>
          )}
          {e.side && <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full" style={{ background: "rgba(194,103,68,.92)", color: "#fff" }}>{e.side}</span>}
        </div>
        <h2 className="text-[26px] font-normal leading-[1.12] shrink-0" style={{ color: "#2b2620" }}>{e.pose.name}</h2>
        <div className="relative flex items-center justify-center shrink-0 mt-2" style={{ width: 172, height: 172 }}>
          <div style={{ ...ringLayer, inset: 0, background: "radial-gradient(circle, rgba(194,103,68,.2), rgba(226,167,120,.1) 60%, transparent 74%)" }} />
          <div style={{ ...ringLayer, inset: 30, border: "1.5px solid rgba(194,103,68,.3)" }} />
          <div className="relative text-[48px] font-light tabular-nums" style={{ color: "#2b2620" }}>{mmss}</div>
        </div>
        {Caption}
        {isBreaths && e.breaths && <span className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ opacity: 0.45 }}>{e.breaths} breaths</span>}
        {e.pose.cue && <p className="italic font-light leading-[1.55] text-[15px]" style={{ maxWidth: 290, opacity: 0.78 }}>{e.pose.cue}</p>}
      </div>
      {Safety}
      {Controls}
    </div>
  );
}
