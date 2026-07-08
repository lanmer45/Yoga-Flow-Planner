import { useState } from "react";
import { Link } from "wouter";
import { Plus, Play, History, ChevronLeft } from "lucide-react";
import { useListRoutines, useListTags, useListSessions } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Library() {
  const { data: routines, isLoading: loadingRoutines } = useListRoutines();
  const { data: tags } = useListTags();
  const { data: sessions } = useListSessions();
  const [selectedTag, setSelectedTag] = useState<string>("All");

  const relativeDays = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "recently";
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 14) return "last week";
    if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  // Most recent completion per routine, to help avoid repeating a flow too soon
  const lastPracticed = new Map<number, string>();
  sessions?.forEach((s) => {
    if (s.routineId == null) return;
    const existing = lastPracticed.get(s.routineId);
    if (!existing || new Date(String(s.completedAt)) > new Date(existing)) {
      lastPracticed.set(s.routineId, String(s.completedAt));
    }
  });

  const filteredRoutines = routines?.filter(routine => 
    selectedTag === "All" ? true : routine.tags.includes(selectedTag)
  );

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <Link href="/builder" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <Plus /> New
        </Link>
      </div>

      <h1 className="text-3xl font-light text-primary">Flows</h1>

      <div className="w-full overflow-hidden">
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex w-max space-x-2">
            <Badge 
              variant={selectedTag === "All" ? "default" : "secondary"} 
              className="cursor-pointer font-medium px-3 py-1"
              onClick={() => setSelectedTag("All")}
            >
              All
            </Badge>
            {tags?.map(tag => (
              <Badge 
                key={tag.id} 
                variant={selectedTag === tag.name ? "default" : "secondary"} 
                className="cursor-pointer font-medium px-3 py-1"
                onClick={() => setSelectedTag(tag.name)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="space-y-4">
        {loadingRoutines ? (
          <div className="text-center py-12 text-muted-foreground">Loading flows...</div>
        ) : filteredRoutines?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {selectedTag === "All" ? "No flows yet. Create one to get started." : `No flows found with tag "${selectedTag}".`}
          </div>
        ) : (
          filteredRoutines?.map((routine) => (
            <Card key={routine.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{routine.title}</CardTitle>
                {routine.description && (
                  <CardDescription className="line-clamp-2">{routine.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-3 text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span>~{Math.round(routine.totalSeconds / 60)} min</span>
                  <span>{routine.poseCount} poses</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <History className="w-3.5 h-3.5" />
                  {lastPracticed.has(routine.id) ? (
                    <span>Last practiced {relativeDays(lastPracticed.get(routine.id)!)}</span>
                  ) : (
                    <span className="italic opacity-70">Not practiced yet</span>
                  )}
                </div>
                {routine.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {routine.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="font-normal text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                {routine.cautions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {routine.cautions.map(c => (
                      <Badge key={c} variant="outline" className="text-[10px] text-destructive border-destructive/20 bg-destructive/5">{c}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 pt-3 border-t flex justify-between">
                <Link href={`/routines/${routine.id}`} className="text-sm font-medium text-secondary hover:underline">
                  View details
                </Link>
                <Link href={`/run/${routine.id}`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3">
                  <Play className="fill-current" /> Run
                </Link>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
      
      <div className="pt-2">
        <Link
          href="/history"
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary transition-colors"
        >
          <History className="w-4 h-4" /> View practice history
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-8 pb-4">
        Listen to your body. Skip or modify anything that doesn't feel right. Chair options are available for every pose.
      </p>
    </div>
  );
}