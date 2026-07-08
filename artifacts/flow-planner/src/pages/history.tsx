import { Link } from "wouter";
import { History as HistoryIcon, ChevronLeft } from "lucide-react";
import { useListSessions } from "@workspace/api-client-react";

export default function History() {
  const { data: sessions } = useListSessions();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-5">
      <div className="flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 pt-2 pb-3 -mx-4 px-4 border-b border-border/50">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <h1 className="text-lg font-medium text-primary">History</h1>
        <span className="w-14" />
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
          <HistoryIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
          No practices logged yet. Finish a flow all the way through and it'll show up here so you can pace how often you repeat each one.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{session.routineTitle}</p>
                <p className="text-xs text-muted-foreground">{formatDate(String(session.completedAt))}</p>
              </div>
              <span className="text-muted-foreground whitespace-nowrap pl-3">
                {Math.round(session.totalSeconds / 60)} min
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
