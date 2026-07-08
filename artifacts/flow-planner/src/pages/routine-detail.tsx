import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetRoutine, useListPoses, useDeleteRoutine, useDuplicateRoutine } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Copy, Edit2, Trash2, Clock, AlertTriangle, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function RoutineDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: routine, isLoading: loadingRoutine } = useGetRoutine(Number(params.id));
  const { data: poses, isLoading: loadingPoses } = useListPoses();
  const deleteRoutine = useDeleteRoutine();
  const duplicateRoutine = useDuplicateRoutine();

  if (loadingRoutine || loadingPoses) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }
  
  if (!routine || !poses) {
    return <div className="p-8 text-center text-destructive">Routine not found</div>;
  }

  const poseMap = new Map(poses.map(p => [p.id, p]));

  const renderSection = (entries: any[], title: string) => {
    if (!entries || entries.length === 0) return null;
    
    return (
      <div className="space-y-3 mb-8">
        <h3 className="text-xl font-medium text-secondary">{title}</h3>
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const pose = poseMap.get(entry.poseId);
            if (!pose) return null;
            
            return (
              <Card key={`${entry.poseId}-${idx}`} className="overflow-hidden border-muted">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        {pose.name}
                        {pose.perSide && <Badge variant="secondary" className="text-[10px]">Per side</Badge>}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{pose.cue}</p>
                    </div>
                    <div className="text-right text-sm font-medium whitespace-nowrap bg-muted px-2 py-1 rounded text-muted-foreground">
                      {pose.durationType === 'breaths' && entry.breaths 
                        ? `${entry.breaths} breaths` 
                        : `${entry.durationSeconds}s`}
                    </div>
                  </div>
                  
                  {(pose.cautions.length > 0 || pose.modification || pose.chairOption) && (
                    <div className="mt-4 pt-3 border-t border-muted/50 space-y-2 text-xs">
                      {pose.cautions.length > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {pose.cautions.map((c: string) => (
                              <span key={c} className="text-destructive font-medium">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {pose.modification && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <User className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Mod: {pose.modification}</span>
                        </div>
                      )}
                      
                      {pose.chairOption && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <User className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Chair: {pose.chairOption}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDelete = () => {
    deleteRoutine.mutate({ id: routine.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
        setLocation("/flows");
      }
    });
  };

  const handleDuplicate = () => {
    duplicateRoutine.mutate({ id: routine.id }, {
      onSuccess: (newRoutine) => {
        queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
        setLocation(`/routines/${newRoutine.id}`);
      }
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <div className="space-y-4">
        <Link href="/flows" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← Back to Flows
        </Link>
        
        <div>
          <h1 className="text-3xl font-light text-primary mb-2">{routine.title}</h1>
          {routine.description && <p className="text-muted-foreground text-sm">{routine.description}</p>}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {routine.tags.map(tag => (
            <Badge key={tag} variant="outline" className="font-normal">{tag}</Badge>
          ))}
          <Badge variant="secondary" className="font-medium bg-secondary/10 text-secondary border-none">
            <Clock className="w-3 h-3 mr-1" />
            {Math.round(routine.totalSeconds / 60)} min
          </Badge>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" size="lg" asChild>
            <Link href={`/run/${routine.id}`}>
              <Play className="w-4 h-4 mr-2 fill-current" /> Run Flow
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/builder/${routine.id}`}>
              <Edit2 className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDuplicate} disabled={duplicateRoutine.isPending}>
            <Copy className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Flow?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the "{routine.title}" flow.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-6 pt-4">
        {renderSection(routine.sections.centering, "Centering")}
        {renderSection(routine.sections.flow, "Flow")}
        {renderSection(routine.sections.closing, "Closing")}
      </div>
      
      <div className="text-center text-xs text-muted-foreground pt-12 pb-8 border-t">
        Listen to your body. Skip or modify anything that doesn't feel right. Chair options are available for every pose.
      </div>
    </div>
  );
}
