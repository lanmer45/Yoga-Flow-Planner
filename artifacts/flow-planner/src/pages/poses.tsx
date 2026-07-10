import { useState } from "react";
import { Link } from "wouter";
import {
  useListPoses,
  getListPosesQueryKey,
  useCreatePose,
  useUpdatePose,
} from "@workspace/api-client-react";
import type { PoseInputCategory, PoseInputDurationType, PoseInputCautionsItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Search, ChevronLeft } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpload } from "@workspace/object-storage-web";
import { ImagePlus, X, Loader2 } from "lucide-react";

const imageSrc = (path: string) => (/^https?:\/\//.test(path) ? path : `/api/storage${path}`);

const CATEGORIES = ["All", "Centering", "Warm-Up", "Standing", "Backbend", "Twist", "Hip", "Floor", "Rest", "Closing"];
const CAUTIONS = ["Back", "Knees", "Wrists", "Neck", "Shoulders", "Hips", "Balance"];

const emptyPose = {
  name: "",
  category: "Centering" as PoseInputCategory,
  durationType: "time" as PoseInputDurationType,
  defaultDurationSeconds: 30,
  defaultBreaths: 5,
  perSide: false,
  cue: "",
  cautions: [] as PoseInputCautionsItem[],
  modification: "",
  chairOption: "",
  imageUrl: null as string | null,
};

export default function Poses() {
  const { data: poses, isLoading } = useListPoses();
  const createPose = useCreatePose();
  const updatePose = useUpdatePose();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [hiddenCautions, setHiddenCautions] = useState<string[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPoseId, setEditingPoseId] = useState<number | null>(null);
  const [newPose, setNewPose] = useState({ ...emptyPose });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (res) => setNewPose((prev) => ({ ...prev, imageUrl: res.objectPath })),
    onError: () => alert("Image upload failed. Please try again."),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const resetForm = () => {
    setEditingPoseId(null);
    setNewPose({ ...emptyPose });
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (pose: any) => {
    setEditingPoseId(pose.id);
    setNewPose({
      name: pose.name,
      category: pose.category,
      durationType: pose.durationType,
      defaultDurationSeconds: pose.defaultDurationSeconds,
      defaultBreaths: pose.defaultBreaths ?? 5,
      perSide: pose.perSide,
      cue: pose.cue ?? "",
      cautions: [...pose.cautions],
      modification: pose.modification ?? "",
      chairOption: pose.chairOption ?? "",
      imageUrl: pose.imageUrl ?? null,
    });
    setIsDialogOpen(true);
  };

  const handleSavePose = () => {
    if (!newPose.name.trim()) return alert("Name is required");

    const payload = {
      ...newPose,
      defaultBreaths: newPose.durationType === "breaths" ? newPose.defaultBreaths : null,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListPosesQueryKey() });
      setIsDialogOpen(false);
      resetForm();
    };

    if (editingPoseId != null) {
      updatePose.mutate({ id: editingPoseId, data: payload }, { onSuccess });
    } else {
      createPose.mutate({ data: payload }, { onSuccess });
    }
  };

  const toggleHiddenCaution = (c: string) => {
    setHiddenCautions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const filtered = poses?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (hiddenCautions.length > 0 && p.cautions.some((c) => hiddenCautions.includes(c))) return false;
    return true;
  });

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-5">
      <div className="flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 pt-2 pb-3 -mx-4 px-4 border-b border-border/50">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <h1 className="text-lg font-medium text-primary">Pose Library</h1>
        <Button size="sm" variant="outline" onClick={openCreate}>
          Create Pose
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search poses..."
            className="pl-9 bg-muted/50 border-transparent focus-visible:ring-primary h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground">Category:</span>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-1">
              {CATEGORIES.map((c) => (
                <Badge
                  key={c}
                  variant={categoryFilter === c ? "default" : "secondary"}
                  className="cursor-pointer font-normal"
                  onClick={() => setCategoryFilter(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground">Hide Cautions:</span>
          <div className="flex flex-wrap gap-1">
            {CAUTIONS.map((c) => (
              <Badge
                key={c}
                variant={hiddenCautions.includes(c) ? "destructive" : "outline"}
                className={`cursor-pointer font-normal text-[10px] ${!hiddenCautions.includes(c) ? "text-destructive border-destructive/20 bg-destructive/5" : ""}`}
                onClick={() => toggleHiddenCaution(c)}
              >
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading poses...</div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No poses match your filters.</div>
        ) : (
          filtered?.map((pose) => (
            <div key={pose.id} className="p-3 border rounded-lg bg-card">
              <div className="flex justify-between items-start gap-2">
                <div className="font-medium text-foreground">{pose.name}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{pose.category}</Badge>
                  <button
                    onClick={() => openEdit(pose)}
                    className="text-[11px] font-medium text-secondary hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {pose.cue && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{pose.cue}</div>}
              {pose.modification && (
                <div className="text-[11px] text-muted-foreground mt-1"><span className="font-medium text-foreground/70">Mod:</span> {pose.modification}</div>
              )}
              {pose.chairOption && (
                <div className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground/70">Chair:</span> {pose.chairOption}</div>
              )}
              {pose.cautions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {pose.cautions.map((c: string) => (
                    <span key={c} className="text-[10px] bg-destructive/10 text-destructive px-1 rounded">{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 shrink-0">
            <DialogTitle>{editingPoseId != null ? "Edit Pose" : "Add Custom Pose"}</DialogTitle>
            {editingPoseId != null && (
              <p className="text-xs text-muted-foreground">Changes apply everywhere this pose is used.</p>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 px-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={newPose.name} onChange={(e) => setNewPose({ ...newPose, name: e.target.value })} placeholder="Pose name" />
              </div>
              <div className="space-y-2">
                <Label>Image (Optional)</Label>
                {newPose.imageUrl ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img src={imageSrc(newPose.imageUrl)} alt="Pose" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewPose({ ...newPose, imageUrl: null })}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1 shadow"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 w-full aspect-video rounded-lg border border-dashed cursor-pointer bg-muted/40 hover:bg-muted transition-colors text-muted-foreground">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6" />
                        <span className="text-xs">Tap to upload an image</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isUploading} />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newPose.category} onValueChange={(val: any) => setNewPose({ ...newPose, category: val })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration Type</Label>
                  <Select value={newPose.durationType} onValueChange={(val: any) => setNewPose({ ...newPose, durationType: val })}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="breaths">Breaths</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <div className="flex items-center">
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-r-none border-r-0" onClick={() => setNewPose({ ...newPose, defaultDurationSeconds: Math.max(5, newPose.defaultDurationSeconds - 5) })}>-</Button>
                    <Input type="number" className="h-9 rounded-none text-center tabular-nums" value={newPose.defaultDurationSeconds} onChange={(e) => setNewPose({ ...newPose, defaultDurationSeconds: Math.max(5, parseInt(e.target.value) || 5) })} />
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-l-none border-l-0" onClick={() => setNewPose({ ...newPose, defaultDurationSeconds: newPose.defaultDurationSeconds + 5 })}>+</Button>
                  </div>
                </div>
              </div>
              {newPose.durationType === "breaths" && (
                <div className="space-y-2">
                  <Label>Breaths</Label>
                  <Input type="number" value={newPose.defaultBreaths} onChange={(e) => setNewPose({ ...newPose, defaultBreaths: Math.max(1, parseInt(e.target.value) || 1) })} />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox id="perSide" checked={newPose.perSide} onCheckedChange={(checked: boolean) => setNewPose({ ...newPose, perSide: checked })} />
                <label htmlFor="perSide" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Repeat per side (Left/Right)
                </label>
              </div>
              <div className="space-y-2">
                <Label>Cue (Optional)</Label>
                <Textarea value={newPose.cue} onChange={(e) => setNewPose({ ...newPose, cue: e.target.value })} placeholder="Instructional cue" rows={2} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label>Modification (Optional)</Label>
                <Input value={newPose.modification} onChange={(e) => setNewPose({ ...newPose, modification: e.target.value })} placeholder="Easier variation" />
              </div>
              <div className="space-y-2">
                <Label>Chair Option (Optional)</Label>
                <Input value={newPose.chairOption} onChange={(e) => setNewPose({ ...newPose, chairOption: e.target.value })} placeholder="Chair-bound variation" />
              </div>
              <div className="space-y-2">
                <Label>Cautions (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {CAUTIONS.map((c) => {
                    const isSelected = newPose.cautions.includes(c as PoseInputCautionsItem);
                    return (
                      <Badge
                        key={c}
                        variant={isSelected ? "destructive" : "outline"}
                        className={`cursor-pointer ${!isSelected ? "text-muted-foreground" : ""}`}
                        onClick={() => setNewPose({
                          ...newPose,
                          cautions: isSelected
                            ? newPose.cautions.filter((x) => x !== c)
                            : [...newPose.cautions, c as PoseInputCautionsItem],
                        })}
                      >
                        {c}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="pt-4 pb-2">
                <Button className="w-full" onClick={handleSavePose} disabled={createPose.isPending || updatePose.isPending || !newPose.name.trim()}>
                  {editingPoseId != null ? "Save Changes" : "Save Pose"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
