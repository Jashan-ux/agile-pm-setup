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
import { useCreateProject, useProject, useUpdateProject } from "@/hooks/useProjects";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "archived"]),
  owner_name: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  projectId?: string; // if provided = edit mode
}

export function ProjectForm({ open, onClose, projectId }: ProjectFormProps) {
  const isEdit = Boolean(projectId);
  const { data: existingProject } = useProject(projectId ?? "");
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "planning" },
  });

  useEffect(() => {
    if (existingProject && isEdit) {
      reset({
        name: existingProject.name,
        description: existingProject.description ?? "",
        status: existingProject.status,
        owner_name: existingProject.owner_name ?? "",
      });
    } else if (!isEdit) {
      reset({ status: "planning" });
    }
  }, [existingProject, isEdit, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && projectId) {
        await updateProject.mutateAsync({ id: projectId, payload: values });
      } else {
        await createProject.mutateAsync(values);
      }
      onClose();
      reset();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Project" : "Create Project"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue="planning"
                onValueChange={(v) => setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter description"
                rows={3}
                {...register("description")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}