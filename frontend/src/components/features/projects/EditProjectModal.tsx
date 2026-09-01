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
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "@/hooks/useToast";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "archived"]),
  owner_name: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditProjectModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function EditProjectModal({
  projectId,
  open,
  onClose,
}: EditProjectModalProps) {
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject();

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
    if (project) {
      reset({
        name: project.name,
        description: project.description ?? "",
        status: project.status,
        owner_name: project.owner_name ?? "",
      });
    }
  }, [project, reset]);

  const currentStatus = watch("status");

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        payload: values,
      });
      toast.success("Project updated", `"${values.name}" has been saved`);
      onClose();
    } catch (e: any) {
      toast.error("Update failed", e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="Enter project name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={currentStatus}
                onValueChange={(v) => setValue("status", v as any, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner_name">Owner</Label>
              <Input
                id="owner_name"
                placeholder="Owner name"
                {...register("owner_name")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Project description"
              rows={3}
              {...register("description")}
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