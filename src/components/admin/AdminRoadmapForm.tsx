import { useState, useEffect } from "react";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const roadmapSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  order_number: z.coerce.number().min(1, "Order must be at least 1"),
  duration: z.string().optional(),
  item_type: z.enum(["milestone", "checkpoint", "objective"]),
  icon: z.string().default("circle"),
  is_required: z.boolean().default(true),
});

type RoadmapFormValues = z.infer<typeof roadmapSchema>;

type RoadmapItem = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_number: number;
  duration: string | null;
  item_type: string;
  icon: string | null;
  is_required: boolean | null;
  video_url: string | null;
};

interface AdminRoadmapFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  item?: RoadmapItem | null;
  onSuccess: () => void;
  nextOrderNumber: number;
}

const iconOptions = [
  { value: "circle", label: "Circle" },
  { value: "star", label: "Star" },
  { value: "flag", label: "Flag" },
  { value: "target", label: "Target" },
  { value: "book", label: "Book" },
  { value: "video", label: "Video" },
  { value: "file-text", label: "Document" },
  { value: "check-circle", label: "Checkmark" },
  { value: "award", label: "Award" },
  { value: "trophy", label: "Trophy" },
];

export function AdminRoadmapForm({
  open,
  onOpenChange,
  courseId,
  item,
  onSuccess,
  nextOrderNumber,
}: AdminRoadmapFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const form = useForm<RoadmapFormValues>({
    resolver: zodResolver(roadmapSchema),
    defaultValues: {
      title: "",
      description: "",
      order_number: nextOrderNumber,
      duration: "",
      item_type: "milestone",
      icon: "circle",
      is_required: true,
    },
  });

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

  const uploadVideo = async (itemId: string): Promise<string | null> => {
    if (!videoFile) return item?.video_url || null;

    setUploading(true);
    setUploadProgress(0);

    const fileExt = videoFile.name.split(".").pop();
    const fileName = `roadmap/${courseId}/${itemId}/video.${fileExt}`;

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

  // Reset form when item changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: item?.title || "",
        description: item?.description || "",
        order_number: item?.order_number || nextOrderNumber,
        duration: item?.duration || "",
        item_type: (item?.item_type as "milestone" | "checkpoint" | "objective") || "milestone",
        icon: item?.icon || "circle",
        is_required: item?.is_required ?? true,
      });
      setVideoFile(null);
      setUploadProgress(0);
    }
  }, [item, open, nextOrderNumber, form]);

  const onSubmit = async (values: RoadmapFormValues) => {
    setLoading(true);
    try {
      const roadmapData = {
        course_id: courseId,
        title: values.title,
        description: values.description || null,
        order_number: values.order_number,
        duration: values.duration || null,
        item_type: values.item_type,
        icon: values.icon,
        is_required: values.is_required,
      };

      if (item) {
        // Update existing item
        const videoUrl = await uploadVideo(item.id);
        const { error } = await supabase
          .from("course_roadmap_items")
          .update({ ...roadmapData, video_url: videoUrl })
          .eq("id", item.id);

        if (error) throw error;
        toast({ title: "Roadmap item updated successfully" });
      } else {
        // Create new item
        const { data: newItem, error } = await supabase
          .from("course_roadmap_items")
          .insert(roadmapData)
          .select()
          .single();

        if (error) throw error;

        if (videoFile && newItem) {
          const videoUrl = await uploadVideo(newItem.id);
          await supabase
            .from("course_roadmap_items")
            .update({ video_url: videoUrl })
            .eq("id", newItem.id);
        }
        toast({ title: "Roadmap item created successfully" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving roadmap item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save roadmap item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Roadmap Item" : "Add Roadmap Item"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Video Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Content (Optional)</label>
              <div className="flex flex-col gap-2">
                {item?.video_url && !videoFile && (
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

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Complete Introduction Module" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this milestone covers..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="item_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="milestone">Milestone</SelectItem>
                        <SelectItem value="checkpoint">Checkpoint</SelectItem>
                        <SelectItem value="objective">Objective</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2 weeks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Required for course completion</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {item ? "Update" : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}