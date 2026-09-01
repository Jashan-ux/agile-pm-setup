import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStory, useUpdateStory } from "@/hooks/useStories";
import { toast } from "@/hooks/useToast";
import { STORY_POINTS } from "@/lib/constants";

const schema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  acceptance_criteria: z.string().max(5000).optional(),
  status: z.enum([
    "backlog","ready","in_progress","in_review","done","cancelled",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  story_points: z.number().optional(),
  assignee_name: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditStoryModalProps {
  projectId: string;
  storyId: string;
  open: boolean;
  onClose: () => void;
}

export function EditStoryModal({
  projectId,
  storyId,
  open,
  onClose,
}: EditStoryModalProps) {
  const { data: story } = useStory(projectId, storyId);
  const updateStory = useUpdateStory(projectId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (story) {
      reset({
        title: story.title,
        description: story.description ?? "",
        acceptance_criteria: story.acceptance_criteria ?? "",
        status: story.status,
        priority: story.priority,
        story_points: story.story_points ?? undefined,
        assignee_name: story.assignee_name ?? "",
      });
    }
  }, [story, reset]);

  const currentStatus = watch("status");
  const currentPriority = watch("priority");

  const onSubmit = async (values: FormValues) => {
    try {
      await updateStory.mutateAsync({ storyId, payload: values });
      toast.success("Story updated");
      onClose();
    } catch (e: any) {
      toast.error("Update failed", e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User Story</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input placeholder="Story title" {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="As a user, I want..."
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Acceptance Criteria</Label>
            <Textarea
              placeholder="- Criterion 1&#10;- Criterion 2"
              rows={3}
              {...register("acceptance_criteria")}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={currentStatus}
                onValueChange={(v) =>
                  setValue("status", v as any, { shouldDirty: true })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "backlog","ready","in_progress",
                    "in_review","done","cancelled",
                  ].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={currentPriority}
                onValueChange={(v) =>
                  setValue("priority", v as any, { shouldDirty: true })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "critical"].map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Story Points</Label>
              <Select
                value={String(watch("story_points") ?? "")}
                onValueChange={(v) =>
                  setValue("story_points", parseInt(v), {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Points" />
                </SelectTrigger>
                <SelectContent>
                  {STORY_POINTS.map((p) => (
                    <SelectItem key={p} value={String(p)} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Input
              placeholder="Assignee name"
              {...register("assignee_name")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}