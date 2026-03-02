import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const moduleSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  duration: z.string().min(1, "Duration is required"),
  order_number: z.coerce.number().min(1, "Order must be at least 1"),
  is_preview: z.boolean().default(false),
  has_quiz: z.boolean().default(false),
  pass_percentage: z.coerce.number().min(0).max(100).optional(),
  total_questions: z.coerce.number().min(0).optional(),
  allow_retries: z.boolean().default(true),
  requires_passing: z.boolean().default(false),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration: string;
  order_number: number;
  is_preview: boolean | null;
  video_url: string | null;
  has_quiz: boolean | null;
  pass_percentage: number | null;
  total_questions: number | null;
  allow_retries: boolean | null;
  requires_passing: boolean | null;
};

interface AdminModuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  module?: Module | null;
  onSuccess: () => void;
  nextOrderNumber: number;
}

export function AdminModuleForm({
  open,
  onOpenChange,
  courseId,
  module,
  onSuccess,
  nextOrderNumber,
}: AdminModuleFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: module?.title || "",
      description: module?.description || "",
      duration: module?.duration || "",
      order_number: module?.order_number || nextOrderNumber,
      is_preview: module?.is_preview || false,
      has_quiz: module?.has_quiz || false,
      pass_percentage: module?.pass_percentage || 70,
      total_questions: module?.total_questions || 5,
      allow_retries: module?.allow_retries ?? true,
      requires_passing: module?.requires_passing || false,
    },
  });

  const hasQuiz = form.watch("has_quiz");

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Video must be less than 100MB",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const uploadVideo = async (moduleId: string): Promise<string | null> => {
    if (!videoFile) return module?.video_url || null;

    setUploading(true);
    setUploadProgress(0);

    const fileExt = videoFile.name.split(".").pop();
    const fileName = `modules/${moduleId}/video.${fileExt}`;

    // Simulate progress since Supabase doesn't provide upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    const { error: uploadError } = await supabase.storage
      .from("course-content")
      .upload(fileName, videoFile, { upsert: true });

    clearInterval(progressInterval);
    setUploadProgress(100);

    if (uploadError) {
      console.error("Video upload error:", uploadError);
      setUploading(false);
      return null;
    }

    const { data } = supabase.storage
      .from("course-content")
      .getPublicUrl(fileName);

    setUploading(false);
    return data.publicUrl;
  };

  const onSubmit = async (values: ModuleFormValues) => {
    setLoading(true);
    try {
      const moduleData = {
        course_id: courseId,
        title: values.title,
        description: values.description || null,
        duration: values.duration,
        order_number: values.order_number,
        is_preview: values.is_preview,
        has_quiz: values.has_quiz,
        pass_percentage: values.has_quiz ? values.pass_percentage : null,
        total_questions: values.has_quiz ? values.total_questions : null,
        allow_retries: values.has_quiz ? values.allow_retries : null,
        requires_passing: values.has_quiz ? values.requires_passing : null,
      };

      if (module) {
        // Update existing module
        const videoUrl = await uploadVideo(module.id);
        const { error } = await supabase
          .from("course_modules")
          .update({ ...moduleData, video_url: videoUrl })
          .eq("id", module.id);

        if (error) throw error;
        toast({ title: "Module updated successfully" });
      } else {
        // Create new module
        const { data: newModule, error } = await supabase
          .from("course_modules")
          .insert(moduleData)
          .select()
          .single();

        if (error) throw error;

        if (videoFile && newModule) {
          const videoUrl = await uploadVideo(newModule.id);
          await supabase
            .from("course_modules")
            .update({ video_url: videoUrl })
            .eq("id", newModule.id);
        }
        toast({ title: "Module created successfully" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving module:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save module",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {module ? "Edit Module" : "Create New Module"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Video Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Content</label>
              <div className="flex flex-col gap-2">
                {module?.video_url && !videoFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Video className="h-4 w-4" />
                    <span className="text-sm truncate">Current video uploaded</span>
                  </div>
                )}
                {videoFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Video className="h-4 w-4" />
                    <span className="text-sm truncate">{videoFile.name}</span>
                  </div>
                )}
                {uploading && (
                  <Progress value={uploadProgress} className="h-2" />
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted w-fit">
                    <Upload className="h-4 w-4" />
                    <span>Upload Video</span>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Module title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Module description"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 15 min" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_preview"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Preview Module</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="has_quiz"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Has Quiz</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {hasQuiz && (
              <div className="border rounded-md p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium">Quiz Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pass_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pass Percentage (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_questions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Questions</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-6">
                  <FormField
                    control={form.control}
                    name="allow_retries"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="!mt-0">Allow Retries</FormLabel>
                          <FormDescription>
                            Students can retake the quiz
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_passing"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="!mt-0">Requires Passing</FormLabel>
                          <FormDescription>
                            Must pass to continue
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {(loading || uploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {module ? "Update Module" : "Create Module"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
