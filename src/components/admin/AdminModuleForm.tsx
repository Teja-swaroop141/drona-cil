import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

// ── Constants ───────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_MYSQL_API_URL || "http://localhost:4000";
const TOKEN_KEY = "mysql_auth_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);
const apiHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ── Schema ──────────────────────────────────────────────────────
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
  video_url: z.string().optional(),
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
  const [uploadType, setUploadType] = useState<"file" | "url">("file");

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: "",
      order_number: nextOrderNumber,
      is_preview: false,
      has_quiz: false,
      pass_percentage: 70,
      total_questions: 5,
      allow_retries: true,
      requires_passing: false,
      video_url: "",
    },
  });

  // Reset form when dialog opens / module changes
  useEffect(() => {
    if (open) {
      form.reset({
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
        video_url: module?.video_url || "",
      });
      setVideoFile(null);
      setUploadProgress(0);
      setUploading(false);
      setUploadType(
        module?.video_url && !module.video_url.includes("/uploads/videos/")
          ? "url"
          : "file"
      );
    }
  }, [open, module, form, nextOrderNumber]);

  const hasQuiz = form.watch("has_quiz");

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  // Upload video via Express /upload/video — same pattern as course image upload
  const uploadVideoFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress (XHR progress events require XMLHttpRequest)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 8, 90));
    }, 400);

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("courseName", form.getValues("title"));
      formData.append("file", file);
      const response = await fetch(`${API_URL}/upload/video`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const body = await response.json();
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (!response.ok) {
        console.error("Video upload error:", body.error);
        return null;
      }
      return body.data?.publicUrl || null;
    } catch (err) {
      clearInterval(progressInterval);
      console.error("Video upload exception:", err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Resolve final video_url
  const resolveVideoUrl = async (existingUrl: string | null, formVideoUrl?: string): Promise<string | null> => {
    if (uploadType === "url") {
      return formVideoUrl || null;
    }
    if (videoFile) {
      const uploaded = await uploadVideoFile(videoFile);
      if (uploaded) return uploaded;
      toast({
        title: "Video upload failed",
        description: "Keeping previous video (if any).",
        variant: "destructive",
      });
      return existingUrl;
    }
    return existingUrl;
  };

  // ── REST API helpers ──────────────────────────────────────────
  const createModuleApi = async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/modules`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to create module");
    return body.data as Module;
  };

  const updateModuleApi = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/modules/${id}`, {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to update module");
    return body.data as Module;
  };

  // ── Submit ────────────────────────────────────────────────────
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
        // ── UPDATE ──────────────────────────────────────────────
        const videoUrl = await resolveVideoUrl(module.video_url, values.video_url);
        await updateModuleApi(module.id, { ...moduleData, video_url: videoUrl });
        toast({ title: "Module updated successfully" });
      } else {
        // ── CREATE ──────────────────────────────────────────────
        const newModule = await createModuleApi({ ...moduleData, video_url: null });

        // Attach video after creation
        const videoUrl = await resolveVideoUrl(null, values.video_url);
        if (videoUrl && newModule?.id) {
          await updateModuleApi(newModule.id, { video_url: videoUrl });
        }
        
        toast({ title: "Module created successfully" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to save module";
      console.error("Error saving module:", error);
      toast({
        title: "Error",
        description: msg,
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
            {/* ── Video Content ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Content</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="uploadType"
                    checked={uploadType === "file"}
                    onChange={() => setUploadType("file")}
                  />
                  Upload Video
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="uploadType"
                    checked={uploadType === "url"}
                    onChange={() => setUploadType("url")}
                  />
                  Video URL
                </label>
              </div>

              {uploadType === "file" ? (
                <div className="flex flex-col gap-2">
                  {module?.video_url && !module.video_url.includes("/uploads/videos/") === false && !videoFile && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                      <Video className="h-4 w-4" />
                      <span className="text-sm truncate">Current video uploaded</span>
                    </div>
                  )}
                  {videoFile && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                      <Video className="h-4 w-4" />
                      <span className="text-sm truncate">{videoFile.name}</span>
                    </div>
                  )}
                  {uploading && (
                    <Progress value={uploadProgress} className="h-2" />
                  )}
                  <label className="cursor-pointer inline-block">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted text-sm w-fit bg-secondary">
                      <Upload className="h-4 w-4" />
                      {videoFile ? "Change video" : "Choose video"}
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="video_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Enter video URL (e.g. YouTube, Google Drive, direct link)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
