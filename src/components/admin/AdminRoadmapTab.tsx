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
  Award,
  Book,
  CheckCircle,
  Circle,
  Edit2,
  FileText,
  Flag,
  Loader2,
  Plus,
  Star,
  Target,
  Trash2,
  Trophy,
  Video,
} from "lucide-react";
import { AdminRoadmapForm } from "./AdminRoadmapForm";

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

interface AdminRoadmapTabProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  circle: <Circle className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  flag: <Flag className="h-4 w-4" />,
  target: <Target className="h-4 w-4" />,
  book: <Book className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  "file-text": <FileText className="h-4 w-4" />,
  "check-circle": <CheckCircle className="h-4 w-4" />,
  award: <Award className="h-4 w-4" />,
  trophy: <Trophy className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  milestone: "bg-blue-50 text-blue-700 border-blue-200",
  checkpoint: "bg-orange-50 text-orange-700 border-orange-200",
  objective: "bg-green-50 text-green-700 border-green-200",
};

export function AdminRoadmapTab({
  courseId,
  courseTitle,
  onBack,
}: AdminRoadmapTabProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RoadmapItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_roadmap_items")
        .select("*")
        .eq("course_id", courseId)
        .order("order_number", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error fetching roadmap items:", error);
      toast({
        title: "Error",
        description: "Failed to load roadmap items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [courseId]);

  const handleEdit = (item: RoadmapItem) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("course_roadmap_items")
        .delete()
        .eq("id", itemToDelete.id);

      if (error) throw error;
      toast({ title: "Roadmap item deleted successfully" });
      fetchItems();
    } catch (error: any) {
      console.error("Error deleting roadmap item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete roadmap item",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const nextOrderNumber =
    items.length > 0 ? Math.max(...items.map((i) => i.order_number)) + 1 : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Course Roadmap</h2>
            <p className="text-sm text-muted-foreground">{courseTitle}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedItem(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Roadmap Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">
              {items.filter((i) => i.item_type === "milestone").length}
            </p>
            <p className="text-sm text-muted-foreground">Milestones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-600">
              {items.filter((i) => i.item_type === "checkpoint").length}
            </p>
            <p className="text-sm text-muted-foreground">Checkpoints</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">
              {items.filter((i) => i.is_required).length}
            </p>
            <p className="text-sm text-muted-foreground">Required</p>
          </CardContent>
        </Card>
      </div>

      {/* Roadmap Preview */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Roadmap Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="relative flex items-start gap-4 pl-10">
                    {/* Node */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                      item.item_type === "milestone" ? "bg-blue-500" :
                      item.item_type === "checkpoint" ? "bg-orange-500" : "bg-green-500"
                    } text-white`}>
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    
                    <div className="flex-1 bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        {iconMap[item.icon || "circle"]}
                        <span className="font-medium">{item.title}</span>
                        {item.is_required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {item.duration && (
                          <span className="text-xs text-muted-foreground">Duration: {item.duration}</span>
                        )}
                        {item.video_url && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <Video className="h-3 w-3" />
                            Video
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Roadmap Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No roadmap items found. Add your first item to create a learning path.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.order_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {iconMap[item.icon || "circle"]}
                          <span>{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={typeColors[item.item_type] || ""}
                        >
                          {item.item_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.video_url ? (
                          <Video className="h-4 w-4 text-blue-600" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{item.duration || "—"}</TableCell>
                      <TableCell>
                        {item.is_required ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete(item);
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

      {/* Roadmap Form Dialog */}
      <AdminRoadmapForm
        open={formOpen}
        onOpenChange={setFormOpen}
        courseId={courseId}
        item={selectedItem}
        onSuccess={fetchItems}
        nextOrderNumber={nextOrderNumber}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Roadmap Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.title}"? This
              action cannot be undone.
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