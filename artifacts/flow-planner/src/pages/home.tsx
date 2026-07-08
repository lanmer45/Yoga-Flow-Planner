import { Link } from "wouter";
import { Plus, Play, LayoutGrid, Dumbbell, History, ChevronRight } from "lucide-react";
import { useListRoutines, useListSessions } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";

export default function Home() {
  const { data: routines } = useListRoutines();
  const { data: sessions } = useListSessions();

  const links = [
    {
      href: "/flows",
      title: "Flows",
      desc: routines ? `${routines.length} routine${routines.length === 1 ? "" : "s"} ready to practice` : "Your saved routines",
      icon: LayoutGrid,
    },
    {
      href: "/poses",
      title: "Pose Library",
      desc: "Browse, search, and manage poses",
      icon: Dumbbell,
    },
    {
      href: "/history",
      title: "History",
      desc: sessions && sessions.length > 0 ? `${sessions.length} practice${sessions.length === 1 ? "" : "s"} logged` : "Track completed practices",
      icon: History,
    },
  ];

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <div className="pt-6 pb-2">
        <h1 className="text-3xl font-light text-primary">Flow Planner</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan, build, and practice your yoga flows.</p>
      </div>

      <Link
        href="/builder"
        className="flex items-center justify-between gap-3 rounded-xl bg-primary text-primary-foreground shadow px-5 py-4 transition-colors hover:bg-primary/90"
      >
        <span className="flex items-center gap-3">
          <Plus className="w-5 h-5" />
          <span className="text-base font-medium">New Flow</span>
        </span>
        <ChevronRight className="w-5 h-5 opacity-80" />
      </Link>

      <div className="space-y-3">
        {links.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:border-primary">
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-secondary/10 text-secondary shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{title}</span>
                <span className="block text-xs text-muted-foreground truncate">{desc}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </Card>
          </Link>
        ))}
      </div>

      {routines && routines.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">Jump back in</h2>
          <div className="space-y-2">
            {routines.slice(0, 3).map((routine) => (
              <div key={routine.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <Link href={`/routines/${routine.id}`} className="min-w-0 flex-1">
                  <p className="font-medium truncate">{routine.title}</p>
                  <p className="text-xs text-muted-foreground">
                    ~{Math.round(routine.totalSeconds / 60)} min · {routine.poseCount} poses
                  </p>
                </Link>
                <Link
                  href={`/run/${routine.id}`}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3 shrink-0"
                >
                  <Play className="fill-current w-4 h-4" /> Run
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pt-8 pb-4">
        Listen to your body. Skip or modify anything that doesn't feel right.
      </p>
    </div>
  );
}
