import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetRoutine, useListPoses, useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, X, Bell, BellOff, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Soft chime synth
function playChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(432, ctx.currentTime); // Calming frequency
    osc.frequency.exponentialRampToValueAtTime(216, ctx.currentTime + 1.5);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 3);
  } catch (e) {
    // Ignore audio context errors
  }
}

export default function Runner() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: routine, isLoading: loadingRoutine } = useGetRoutine(Number(params.id));
  const { data: poses, isLoading: loadingPoses } = useListPoses();
  
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
    
    const poseMap = new Map(poses.map(p => [p.id, p]));
    const buildEntries = (entries: any[], sectionName: string) => {
      const result: any[] = [];
      entries.forEach(entry => {
        const pose = poseMap.get(entry.poseId);
        if (!pose) return;
        
        if (pose.perSide) {
          result.push({
            ...entry,
            pose,
            sectionName,
            side: "Right Side",
            duration: Math.max(1, Math.ceil(entry.durationSeconds / 2))
          });
          result.push({
            ...entry,
            pose,
            sectionName,
            side: "Left Side",
            duration: Math.max(1, Math.floor(entry.durationSeconds / 2))
          });
        } else {
          result.push({
            ...entry,
            pose,
            sectionName,
            side: null,
            duration: entry.durationSeconds
          });
        }
      });
      return result;
    };
    
    return [
      ...buildEntries(routine.sections.centering, "Centering"),
      ...buildEntries(routine.sections.flow, "Flow"),
      ...buildEntries(routine.sections.closing, "Closing")
    ];
  }, [routine, poses]);
  
  // Setup WakeLock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isPlaying) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn("Wake lock failed", err);
      }
    };
    
    if (isPlaying) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
    
    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [isPlaying]);

  // Init duration when index changes
  useEffect(() => {
    if (sequence.length > 0 && currentIndex < sequence.length) {
      setTimeLeft(sequence[currentIndex].duration);
    }
  }, [currentIndex, sequence]);

  // Timer tick
  useEffect(() => {
    if (isPlaying && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Auto advance
            if (chimeEnabled) playChime();
            
            if (currentIndex < sequence.length - 1) {
              setCurrentIndex(c => c + 1);
              return 0; // Handled by index change effect
            } else {
              setIsFinished(true);
              setIsPlaying(false);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const handleSkipNext = () => {
    if (currentIndex < sequence.length - 1) {
      setCurrentIndex(c => c + 1);
      if (chimeEnabled) playChime();
    } else {
      setIsFinished(true);
      setIsPlaying(false);
    }
  };

  const handleSkipBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
    }
  };
  
  if (loadingRoutine || loadingPoses) return <div className="p-8 text-center">Loading...</div>;
  if (!routine || !poses) return <div className="p-8 text-center">Not found</div>;

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-background text-foreground flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <Check className="w-12 h-12" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light text-primary">Session Complete</h1>
          <p className="text-lg text-muted-foreground">{routine.title}</p>
          <p className="text-sm font-medium pt-2">
            Time: {Math.round(routine.totalSeconds / 60)} minutes
          </p>
        </div>
        <Button size="lg" className="w-full max-w-xs mt-8" onClick={() => setLocation("/")}>
          Done
        </Button>
      </div>
    );
  }

  if (sequence.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-4">
        <p className="mb-4">This routine has no poses.</p>
        <Button onClick={() => setLocation("/")}>Go Back</Button>
      </div>
    );
  }

  const currentEntry = sequence[currentIndex];
  const progressPercent = ((currentIndex) / sequence.length) * 100;
  const isBreaths = currentEntry.pose.durationType === "breaths";

  return (
    <div className="fixed inset-0 bg-foreground text-background flex flex-col pt-8 pb-12 px-6 safe-area-y">
      {/* Top Bar */}
      <div className="flex justify-between items-center opacity-70">
        <button onClick={() => setLocation(`/routines/${routine.id}`)} className="p-2 -ml-2">
          <X className="w-6 h-6" />
        </button>
        <div className="text-sm font-medium tracking-wider uppercase text-center flex-1">
          {currentEntry.sectionName}
        </div>
        <button onClick={() => setChimeEnabled(!chimeEnabled)} className="p-2 -mr-2">
          {chimeEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5 opacity-50" />}
        </button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 mt-8">
        <div className="space-y-4">
          <h2 className="text-4xl sm:text-5xl font-light leading-tight">
            {currentEntry.pose.name}
          </h2>
          {currentEntry.side && (
            <div className="inline-block px-4 py-1.5 rounded-full bg-background/20 text-sm font-medium uppercase tracking-widest backdrop-blur-sm">
              {currentEntry.side}
            </div>
          )}
        </div>
        
        <div className="py-8">
          {isBreaths && currentEntry.breaths ? (
            <div className="space-y-2">
              <div className="text-6xl font-light text-primary-foreground">{currentEntry.breaths}</div>
              <div className="text-xl opacity-80 uppercase tracking-widest">Breaths</div>
              <div className="text-xl font-mono opacity-50 pt-4">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </div>
            </div>
          ) : (
            <div className="text-7xl font-mono font-light text-primary-foreground tracking-tight">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>
        
        {currentEntry.pose.cue && (
          <p className="text-xl leading-relaxed max-w-md mx-auto opacity-90 px-4">
            "{currentEntry.pose.cue}"
          </p>
        )}
      </div>
      
      {/* Safety Info */}
      <div className="h-16 flex items-center justify-center mb-6">
        <div className="flex gap-2 flex-wrap justify-center text-xs opacity-70">
          {currentEntry.pose.cautions.map((c: string) => (
            <span key={c} className="bg-destructive/30 px-2 py-1 rounded text-destructive-foreground">Caution: {c}</span>
          ))}
          {currentEntry.pose.modification && (
            <span className="bg-background/20 px-2 py-1 rounded">Mod: {currentEntry.pose.modification}</span>
          )}
          {currentEntry.pose.chairOption && (
            <span className="bg-background/20 px-2 py-1 rounded">Chair: {currentEntry.pose.chairOption}</span>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="space-y-8">
        <div className="flex items-center justify-center gap-8">
          <button onClick={handleSkipBack} disabled={currentIndex === 0} className="p-4 opacity-70 hover:opacity-100 disabled:opacity-30 transition-opacity">
            <SkipBack className="w-8 h-8" />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="w-20 h-20 bg-background text-foreground rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          
          <button onClick={handleSkipNext} className="p-4 opacity-70 hover:opacity-100 transition-opacity">
            <SkipForward className="w-8 h-8" />
          </button>
        </div>
        
        <div className="space-y-3 px-4">
          <div className="flex justify-between text-xs opacity-60 font-medium">
            <span>Pose {currentIndex + 1} of {sequence.length}</span>
          </div>
          <div className="h-1.5 bg-background/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-background transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
