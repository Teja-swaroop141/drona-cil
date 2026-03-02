import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Edit2,
  FileQuestion,
  Loader2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { AdminModuleForm } from "./AdminModuleForm";

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

interface AdminModulesTabProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
  onSelectModule: (moduleId: string, moduleTitle: string) => void;
}

export function AdminModulesTab({
  courseId,
  courseTitle,
  onBack,
  onSelectModule,
}: AdminModulesTabProps) {
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_number", { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Error",
        description: "Failed to load modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [courseId]);

  const handleEdit = (module: Module) => {
    setSelectedModule(module);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!moduleToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleToDelete.id);

      if (error) throw error;
      toast({ title: "Module deleted successfully" });
      fetchModules();
    } catch (error: any) {
      console.error("Error deleting module:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete module",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
    }
  };

  const nextOrderNumber = modules.length > 0
    ? Math.max(...modules.map((m) => m.order_number)) + 1
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Modules</h2>
            <p className="text-sm text-muted-foreground">{courseTitle}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedModule(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{modules.length}</p>
            <p className="text-sm text-muted-foreground">Total Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-primary">
              {modules.filter((m) => m.video_url).length}
            </p>
            <p className="text-sm text-muted-foreground">With Video</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-600">
              {modules.filter((m) => m.has_quiz).length}
            </p>
            <p className="text-sm text-muted-foreground">With Quiz</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">
              {modules.filter((m) => m.is_preview).length}
            </p>
            <p className="text-sm text-muted-foreground">Preview</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Course Modules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No modules found. Add your first module to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Quiz Settings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        {module.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{module.title}</p>
                          {module.is_preview && (
                            <Badge variant="secondary" className="mt-1">
                              Preview
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{module.duration}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {module.video_url ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <Video className="h-3 w-3 mr-1" />
                              Video
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Video
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {module.has_quiz ? (
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200"
                            >
                              <FileQuestion className="h-3 w-3 mr-1" />
                              Quiz
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Pass: {module.pass_percentage}% • Questions:{" "}
                              {module.total_questions}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {module.has_quiz && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onSelectModule(module.id, module.title)
                              }
                            >
                              Questions
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(module)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setModuleToDelete(module);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Form Dialog */}
      <AdminModuleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        courseId={courseId}
        module={selectedModule}
        onSuccess={fetchModules}
        nextOrderNumber={nextOrderNumber}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{moduleToDelete?.title}"? This
              will also delete all quiz questions for this module. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
