import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { 
  useGetRoutine, 
  getGetRoutineQueryKey,
  useListPoses, 
  getListPosesQueryKey,
  useListTags,
  getListTagsQueryKey,
  useCreateRoutine,
  useUpdateRoutine,
  useCreateTag,
  useCreatePose,
  useUpdatePose
} from "@workspace/api-client-react";
import type { PoseInputCategory, PoseInputDurationType, PoseInputCautionsItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, X, ArrowUp, ArrowDown, Move } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORY_RANKS: Record<string, number> = {
  'Centering': 0,
  'Warm-Up': 1,
  'Floor': 2,
  'Standing': 3,
  'Backbend': 4,
  'Twist': 5,
  'Hip': 6,
  'Rest': 7,
  'Closing': 8
};

const CATEGORIES = ["All", "Centering", "Warm-Up", "Standing", "Backbend", "Twist", "Hip", "Floor", "Rest", "Closing"];
const CAUTIONS = ["Back", "Knees", "Wrists", "Neck", "Shoulders", "Hips", "Balance"];

export default function Builder() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: initialRoutine, isLoading: loadingRoutine } = useGetRoutine(Number(params.id), {
    query: { enabled: isEdit, queryKey: getGetRoutineQueryKey(Number(params.id)) }
  });
  const { data: poses, isLoading: loadingPoses } = useListPoses();
  const { data: tags, isLoading: loadingTags } = useListTags();
  
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const createTag = useCreateTag();
  const createPose = useCreatePose();
  const updatePose = useUpdatePose();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  const [sections, setSections] = useState<{
    centering: any[],
    flow: any[],
    closing: any[]
  }>({
    centering: [],
    flow: [],
    closing: []
  });

  const [search, setSearch] = useState("");
  const [poseCategoryFilter, setPoseCategoryFilter] = useState("All");
  const [hiddenCautions, setHiddenCautions] = useState<string[]>([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"centering"|"flow"|"closing" | null>(null);
  
  const [isPoseDialogOpen, setIsPoseDialogOpen] = useState(false);
  const [editingPoseId, setEditingPoseId] = useState<number | null>(null);
  const [newPose, setNewPose] = useState({
    name: "",
    category: "Centering" as PoseInputCategory,
    durationType: "time" as PoseInputDurationType,
    defaultDurationSeconds: 30,
    defaultBreaths: 5,
    perSide: false,
    cue: "",
    cautions: [] as PoseInputCautionsItem[],
    modification: "",
    chairOption: ""
  });

  // Initialize form once per loaded routine
  const [initializedId, setInitializedId] = useState<number | null>(null);
  useEffect(() => {
    if (isEdit && initialRoutine && initializedId !== initialRoutine.id) {
      setTitle(initialRoutine.title);
      setDescription(initialRoutine.description || "");
      setSelectedTags(initialRoutine.tags);
      setSections(initialRoutine.sections);
      setInitializedId(initialRoutine.id);
    }
  }, [isEdit, initialRoutine, initializedId]);

  if ((isEdit && loadingRoutine) || loadingPoses || loadingTags) {
    return <div className="p-8 text-center text-muted-foreground">Loading builder...</div>;
  }

  const handleSave = () => {
    if (!title.trim()) return alert("Title is required");
    
    const payload = {
      title,
      description,
      tags: selectedTags,
      sections
    };

    if (isEdit && params.id) {
      updateRoutine.mutate({ id: Number(params.id), data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
          setLocation(`/routines/${params.id}`);
        }
      });
    } else {
      createRoutine.mutate({ data: payload }, {
        onSuccess: (newRoutine) => {
          queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
          setLocation(`/routines/${newRoutine.id}`);
        }
      });
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    createTag.mutate({ data: { name: newTag.trim() } }, {
      onSuccess: (tag) => {
        setSelectedTags(prev => [...new Set([...prev, tag.name])]);
        setNewTag("");
        queryClient.invalidateQueries({ queryKey: getListTagsQueryKey() });
      }
    });
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const toggleHiddenCaution = (c: string) => {
    setHiddenCautions(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const resetPoseForm = () => {
    setEditingPoseId(null);
    setNewPose({
      name: "",
      category: "Centering" as PoseInputCategory,
      durationType: "time" as PoseInputDurationType,
      defaultDurationSeconds: 30,
      defaultBreaths: 5,
      perSide: false,
      cue: "",
      cautions: [],
      modification: "",
      chairOption: ""
    });
  };

  const openCreatePose = () => {
    resetPoseForm();
    setIsPoseDialogOpen(true);
  };

  const openEditPose = (pose: any) => {
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
      chairOption: pose.chairOption ?? ""
    });
    setIsPoseDialogOpen(true);
  };

  const handleSavePose = () => {
    if (!newPose.name.trim()) return alert("Name is required");
    
    const payload = {
      ...newPose,
      defaultBreaths: newPose.durationType === 'breaths' ? newPose.defaultBreaths : null
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListPosesQueryKey() });
      setIsPoseDialogOpen(false);
      resetPoseForm();
    };

    if (editingPoseId != null) {
      updatePose.mutate({ id: editingPoseId, data: payload }, { onSuccess });
    } else {
      createPose.mutate({ data: payload }, { onSuccess });
    }
  };

  const addPose = (pose: any) => {
    if (!activeSection) return;
    
    const entry = {
      poseId: pose.id,
      durationSeconds: pose.defaultDurationSeconds,
      breaths: pose.defaultBreaths
    };

    setSections(prev => {
      const newSections = { ...prev };
      
      if (activeSection === "flow") {
        const poseRank = CATEGORY_RANKS[pose.category] ?? 99;
        const targetList = [...newSections.flow];
        let insertIdx = 0;
        
        for (let i = 0; i < targetList.length; i++) {
          const currentEntryPose = poses?.find(p => p.id === targetList[i].poseId);
          const currentRank = currentEntryPose ? (CATEGORY_RANKS[currentEntryPose.category] ?? 99) : 99;
          if (currentRank <= poseRank) {
            insertIdx = i + 1;
          } else {
            break;
          }
        }
        
        targetList.splice(insertIdx, 0, entry);
        newSections.flow = targetList;
      } else {
        newSections[activeSection].push(entry);
      }
      
      return newSections;
    });
    
    setIsSheetOpen(false);
  };

  const removeEntry = (section: keyof typeof sections, index: number) => {
    setSections(prev => {
      const newList = [...prev[section]];
      newList.splice(index, 1);
      return { ...prev, [section]: newList };
    });
  };

  const moveEntry = (section: keyof typeof sections, index: number, direction: 1 | -1) => {
    setSections(prev => {
      const newList = [...prev[section]];
      if (index + direction < 0 || index + direction >= newList.length) return prev;
      
      const temp = newList[index];
      newList[index] = newList[index + direction];
      newList[index + direction] = temp;
      
      return { ...prev, [section]: newList };
    });
  };

  const updateDuration = (section: keyof typeof sections, index: number, delta: number) => {
    setSections(prev => {
      const newList = [...prev[section]];
      const entry = { ...newList[index] };
      entry.durationSeconds = Math.max(15, entry.durationSeconds + delta);
      newList[index] = entry;
      return { ...prev, [section]: newList };
    });
  };

  const updateBreaths = (section: keyof typeof sections, index: number, delta: number) => {
    setSections(prev => {
      const newList = [...prev[section]];
      const entry = { ...newList[index] };
      const current = entry.breaths ?? 5;
      entry.breaths = Math.max(1, current + delta);
      newList[index] = entry;
      return { ...prev, [section]: newList };
    });
  };

  let totalSeconds = 0;
  Object.values(sections).forEach(list => {
    list.forEach(entry => {
      totalSeconds += entry.durationSeconds;
    });
  });

  const renderSectionBuilder = (name: "centering"|"flow"|"closing", title: string) => {
    const list = sections[name];
    return (
      <div className="space-y-3 mb-8">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-xl font-medium text-secondary">{title}</h3>
          <Sheet open={isSheetOpen && activeSection === name} onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (open) setActiveSection(name);
            else setActiveSection(null);
          }}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-1" /> Add Pose
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-xl px-0 pb-0 flex flex-col">
              <SheetHeader className="px-4 pb-2 text-left shrink-0">
                <div className="flex items-center justify-between">
                  <SheetTitle>Pose Bank</SheetTitle>
                  <Button variant="outline" size="sm" onClick={openCreatePose}>
                    Create Pose
                  </Button>
                </div>
                <div className="space-y-3 mt-4">
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
                        {CATEGORIES.map(c => (
                          <Badge 
                            key={c}
                            variant={poseCategoryFilter === c ? "default" : "secondary"}
                            className="cursor-pointer font-normal"
                            onClick={() => setPoseCategoryFilter(c)}
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
                      {CAUTIONS.map(c => (
                        <Badge 
                          key={c}
                          variant={hiddenCautions.includes(c) ? "destructive" : "outline"}
                          className={`cursor-pointer font-normal text-[10px] ${!hiddenCautions.includes(c) ? 'text-destructive border-destructive/20 bg-destructive/5' : ''}`}
                          onClick={() => toggleHiddenCaution(c)}
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4 pb-8">
                <div className="space-y-2 mt-4">
                  {poses?.filter(p => {
                    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
                    if (poseCategoryFilter !== "All" && p.category !== poseCategoryFilter) return false;
                    if (hiddenCautions.length > 0 && p.cautions.some(c => hiddenCautions.includes(c))) return false;
                    return true;
                  }).map(pose => (
                    <div 
                      key={pose.id} 
                      className="p-3 border rounded-lg hover:border-primary cursor-pointer transition-colors bg-card"
                      onClick={() => addPose(pose)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-medium text-foreground">{pose.name}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{pose.category}</Badge>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); openEditPose(pose); }}
                            className="text-[11px] font-medium text-secondary hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{pose.cue}</div>
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
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
        
        {list.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
            Empty section. Tap to add a pose.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((entry, idx) => {
              const pose = poses?.find(p => p.id === entry.poseId);
              if (!pose) return null;
              
              return (
                <div key={`${entry.poseId}-${idx}`} className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm">
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <button onClick={() => moveEntry(name, idx, -1)} disabled={idx === 0} className="hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveEntry(name, idx, 1)} disabled={idx === list.length - 1} className="hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{pose.name}</div>
                    <div className="text-xs text-muted-foreground">{pose.category}{pose.perSide ? " · per side" : ""}</div>
                    {pose.cautions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {pose.cautions.map((c: string) => (
                          <span key={c} className="text-[10px] bg-destructive/10 text-destructive px-1 rounded">{c}</span>
                        ))}
                      </div>
                    )}
                    {pose.modification && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1"><span className="font-medium text-foreground/70">Mod:</span> {pose.modification}</div>
                    )}
                    {pose.chairOption && (
                      <div className="text-[10px] text-muted-foreground line-clamp-1"><span className="font-medium text-foreground/70">Chair:</span> {pose.chairOption}</div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1 border border-muted">
                      <button onClick={() => updateDuration(name, idx, -15)} className="px-2 font-medium hover:text-primary">-</button>
                      <span className="text-xs font-mono w-8 text-center">{entry.durationSeconds}s</span>
                      <button onClick={() => updateDuration(name, idx, 15)} className="px-2 font-medium hover:text-primary">+</button>
                    </div>
                    {pose.durationType === "breaths" && (
                      <div className="flex items-center gap-2 bg-primary/5 rounded-md p-1 border border-primary/20">
                        <button onClick={() => updateBreaths(name, idx, -1)} className="px-2 font-medium hover:text-primary">-</button>
                        <span className="text-[11px] font-mono w-14 text-center">{entry.breaths ?? pose.defaultBreaths ?? 5} breaths</span>
                        <button onClick={() => updateBreaths(name, idx, 1)} className="px-2 font-medium hover:text-primary">+</button>
                      </div>
                    )}
                    <button onClick={() => removeEntry(name, idx)} className="text-xs text-destructive hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 pt-2 pb-4 -mx-4 px-4 border-b border-border/50">
        <Link href={isEdit ? `/routines/${params.id}` : "/"} className="text-sm font-medium text-muted-foreground hover:text-primary">
          Cancel
        </Link>
        <div className="text-sm font-semibold bg-secondary/10 text-secondary px-3 py-1 rounded-full">
          Total: {Math.round(totalSeconds / 60)} min
        </div>
        <Button size="sm" onClick={handleSave} disabled={createRoutine.isPending || updateRoutine.isPending}>
          Save
        </Button>
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-muted-foreground">Flow Title</Label>
          <Input 
            id="title" 
            placeholder="e.g. Morning Reset" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="text-lg font-medium bg-muted/20 border-border h-12"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-muted-foreground">Description (optional)</Label>
          <Textarea 
            id="description" 
            placeholder="What's the focus of this session?" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            className="resize-none bg-muted/20 border-border"
            rows={2}
          />
        </div>
        
        <div className="space-y-3 pt-2">
          <Label className="text-muted-foreground">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags?.map(tag => (
              <Badge 
                key={tag.id}
                variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                className="cursor-pointer font-medium px-3 py-1 text-sm"
                onClick={() => toggleTag(tag.name)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Input 
              placeholder="New tag..." 
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              className="h-8 text-sm"
            />
            <Button size="sm" variant="secondary" className="h-8 px-3" onClick={handleAddTag} disabled={createTag.isPending || !newTag.trim()}>
              Add Tag
            </Button>
          </div>
        </div>
      </div>
      
      <Separator className="my-6" />

      {renderSectionBuilder("centering", "Centering")}
      {renderSectionBuilder("flow", "Flow")}
      {renderSectionBuilder("closing", "Closing")}

      <Dialog open={isPoseDialogOpen} onOpenChange={(open) => { setIsPoseDialogOpen(open); if (!open) resetPoseForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 shrink-0">
            <DialogTitle>{editingPoseId != null ? "Edit Pose" : "Add Custom Pose"}</DialogTitle>
            {editingPoseId != null && (
              <p className="text-xs text-muted-foreground">Changes apply everywhere this pose is used.</p>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={newPose.name} onChange={e => setNewPose({...newPose, name: e.target.value})} placeholder="Pose name" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newPose.category} onValueChange={(val: any) => setNewPose({...newPose, category: val})}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration Type</Label>
                  <Select value={newPose.durationType} onValueChange={(val: any) => setNewPose({...newPose, durationType: val})}>
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
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-r-none border-r-0" onClick={() => setNewPose({...newPose, defaultDurationSeconds: Math.max(5, newPose.defaultDurationSeconds - 5)})}>-</Button>
                    <Input type="number" className="h-9 rounded-none text-center tabular-nums" value={newPose.defaultDurationSeconds} onChange={e => setNewPose({...newPose, defaultDurationSeconds: Math.max(5, parseInt(e.target.value) || 5)})} />
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-l-none border-l-0" onClick={() => setNewPose({...newPose, defaultDurationSeconds: newPose.defaultDurationSeconds + 5})}>+</Button>
                  </div>
                </div>
              </div>
              {newPose.durationType === 'breaths' && (
                <div className="space-y-2">
                  <Label>Breaths</Label>
                  <Input type="number" value={newPose.defaultBreaths} onChange={e => setNewPose({...newPose, defaultBreaths: Math.max(1, parseInt(e.target.value) || 1)})} />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox id="perSide" checked={newPose.perSide} onCheckedChange={(checked: boolean) => setNewPose({...newPose, perSide: checked})} />
                <label htmlFor="perSide" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Repeat per side (Left/Right)
                </label>
              </div>
              <div className="space-y-2">
                <Label>Cue (Optional)</Label>
                <Textarea value={newPose.cue} onChange={e => setNewPose({...newPose, cue: e.target.value})} placeholder="Instructional cue" rows={2} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label>Modification (Optional)</Label>
                <Input value={newPose.modification} onChange={e => setNewPose({...newPose, modification: e.target.value})} placeholder="Easier variation" />
              </div>
              <div className="space-y-2">
                <Label>Chair Option (Optional)</Label>
                <Input value={newPose.chairOption} onChange={e => setNewPose({...newPose, chairOption: e.target.value})} placeholder="Chair-bound variation" />
              </div>
              <div className="space-y-2">
                <Label>Cautions (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {CAUTIONS.map(c => {
                    const isSelected = newPose.cautions.includes(c as PoseInputCautionsItem);
                    return (
                      <Badge 
                        key={c}
                        variant={isSelected ? "destructive" : "outline"}
                        className={`cursor-pointer ${!isSelected ? 'text-muted-foreground' : ''}`}
                        onClick={() => setNewPose({
                          ...newPose, 
                          cautions: isSelected 
                            ? newPose.cautions.filter(x => x !== c) 
                            : [...newPose.cautions, c as PoseInputCautionsItem]
                        })}
                      >
                        {c}
                      </Badge>
                    )
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