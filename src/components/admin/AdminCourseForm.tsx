import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Link } from "lucide-react";

// ── Constants ───────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_MYSQL_API_URL || "http://localhost:4000";
const TOKEN_KEY = "mysql_auth_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);

// ── Schema ──────────────────────────────────────────────────────
const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  instructor: z.string().min(2, "Instructor name is required"),
  duration: z.string().min(1, "Duration is required"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  image_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: string;
  category: string;
  price: number | null;
  image_url: string | null;
};

interface AdminCourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSuccess: () => void;
}

// ── Component ───────────────────────────────────────────────────
export function AdminCourseForm({
  open,
  onOpenChange,
  course,
  onSuccess,
}: AdminCourseFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [useUrlMode, setUseUrlMode] = useState(false);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      instructor: "",
      duration: "",
      level: "beginner",
      category: "",
      price: 0,
      image_url: "",
    },
  });

  // Reset form when dialog opens or course changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: course?.title || "",
        description: course?.description || "",
        instructor: course?.instructor || "",
        duration: course?.duration || "",
        level:
          (course?.level?.toLowerCase() as
            | "beginner"
            | "intermediate"
            | "advanced") || "beginner",
        category: course?.category || "",
        price: course?.price || 0,
        image_url: course?.image_url || "",
      });
      setImagePreview(course?.image_url || null);
      setImageFile(null);
      setUseUrlMode(false);
    }
  }, [open, course, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      form.setValue("image_url", ""); // clear URL field when a file is chosen
    }
  };

  // Upload via Express /upload/image — returns the public URL or null
  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("courseName", form.getValues("title"));
      formData.append("file", file);
      const response = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        console.error("Upload error:", body.error);
        return null;
      }
      return body.data?.publicUrl || null;
    } catch (err) {
      console.error("Upload exception:", err);
      return null;
    }
  };

  // Resolve the final image_url to persist
  const resolveImageUrl = async (existingUrl: string | null): Promise<string | null> => {
    // 1. A file was picked — upload it
    if (imageFile) {
      const uploaded = await uploadImageFile(imageFile);
      if (uploaded) return uploaded;
      // Upload failed — fall back
      toast({
        title: "Image upload failed",
        description: "Keeping previous image (if any).",
        variant: "destructive",
      });
      return existingUrl;
    }
    // 2. A URL was typed in the form field
    const urlField = form.getValues("image_url");
    if (urlField && urlField.trim() !== "") return urlField.trim();
    // 3. Keep whatever was there before
    return existingUrl;
  };

  // ── Direct REST API helpers (bypasses supabase client entirely for courses) ──
  const apiHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const createCourseApi = async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/courses`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to create course");
    return body.data as Course;
  };

  const updateCourseApi = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/courses/${id}`, {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to update course");
    return body.data as Course;
  };

  // ── Submit ────────────────────────────────────────────────────
  const onSubmit = async (values: CourseFormValues) => {
    setLoading(true);
    try {
      if (course) {
        // ── UPDATE ──────────────────────────────────────────────
        const imageUrl = await resolveImageUrl(course.image_url);
        const payload = {
          title: values.title,
          description: values.description,
          instructor: values.instructor,
          duration: values.duration,
          level: values.level,
          category: values.category,
          price: values.price,
          image_url: imageUrl,
        };
        await updateCourseApi(course.id, payload);
        toast({ title: "Course updated successfully" });
      } else {
        // ── CREATE ──────────────────────────────────────────────
        const payload = {
          title: values.title,
          description: values.description,
          instructor: values.instructor,
          duration: values.duration,
          level: values.level,
          category: values.category,
          price: values.price,
          image_url: null, // will be updated after upload
        };
        const newCourse = await createCourseApi(payload);

        // Now attach the image if any
        const imageUrl = await resolveImageUrl(null);
        if (imageUrl && newCourse?.id) {
          await updateCourseApi(newCourse.id, { image_url: imageUrl });
        }
        toast({ title: "Course created successfully" });
      }

      onSuccess();      // refresh course list
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to save course";
      console.error("Error saving course:", error);
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
            {course ? "Edit Course" : "Create New Course"}
          </DialogTitle>
          <DialogDescription>
            {course
              ? "Update the details for this course."
              : "Fill in the details to create a new course."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Course Image ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Course Image</label>

              {/* Preview */}
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-24 w-40 object-cover rounded-md border"
                />
              )}

              {/* Toggle buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={useUrlMode ? "outline" : "secondary"}
                  onClick={() => setUseUrlMode(false)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload File
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={useUrlMode ? "secondary" : "outline"}
                  onClick={() => {
                    setUseUrlMode(true);
                    setImageFile(null);
                  }}
                >
                  <Link className="h-4 w-4 mr-1" />
                  Paste URL
                </Button>
              </div>

              {/* File picker */}
              {!useUrlMode && (
                <label className="cursor-pointer inline-block">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted text-sm">
                    <Upload className="h-4 w-4" />
                    {imageFile ? imageFile.name : "Choose image"}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}

              {/* URL input (managed by react-hook-form) */}
              {useUrlMode && (
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const v = e.target.value.trim();
                            setImagePreview(v || null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ── Title ── */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Course title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Description ── */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Course description"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Instructor / Duration ── */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instructor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <FormControl>
                      <Input placeholder="Instructor name" {...field} />
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
                      <Input placeholder="e.g., 8 hours" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Level / Category / Price ── */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Language" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {course ? "Update Course" : "Create Course"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
