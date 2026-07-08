import { useState } from "react";
import { Link } from "wouter";
import { Plus, Play } from "lucide-react";
import { useListRoutines, useListTags } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Library() {
  const { data: routines, isLoading: loadingRoutines } = useListRoutines();
  const { data: tags } = useListTags();
  const [selectedTag, setSelectedTag] = useState<string>("All");

  const filteredRoutines = routines?.filter(routine => 
    selectedTag === "All" ? true : routine.tags.includes(selectedTag)
  );

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light text-primary">Flows</h1>
        <Link href="/builder" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <Plus /> New
        </Link>
      </div>

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
      
      <p className="text-center text-xs text-muted-foreground pt-8 pb-4">
        Listen to your body. Skip or modify anything that doesn't feel right. Chair options are available for every pose.
      </p>
    </div>
  );
}