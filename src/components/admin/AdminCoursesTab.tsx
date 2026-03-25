import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Edit2, Loader2, Map, Plus, Search, Trash2 } from "lucide-react";
import { AdminCourseForm } from "./AdminCourseForm";

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
  enrolled_count: number | null;
};

interface AdminCoursesTabProps {
  onSelectCourse: (courseId: string, courseTitle: string) => void;
  onSelectRoadmap: (courseId: string, courseTitle: string) => void;
}

const API_URL = import.meta.env.VITE_MYSQL_API_URL || "http://localhost:4000";
const TOKEN_KEY = "mysql_auth_token";
const getApiHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export function AdminCoursesTab({ onSelectCourse, onSelectRoadmap }: AdminCoursesTabProps) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/courses`, { headers: getApiHeaders() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load courses");
      setCourses(body.data || []);
    } catch (error: unknown) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/courses/${courseToDelete.id}`, {
        method: "DELETE",
        headers: getApiHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to delete course");
      toast({ title: "Course deleted successfully" });
      fetchCourses();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete course";
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedCourse(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-sm text-muted-foreground">Total Courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-primary">
              {courses.filter((c) => c.level?.toLowerCase() === "beginner").length}
            </p>
            <p className="text-sm text-muted-foreground">Beginner</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-600">
              {courses.filter((c) => c.level?.toLowerCase() === "intermediate").length}
            </p>
            <p className="text-sm text-muted-foreground">Intermediate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-600">
              {courses.filter((c) => c.level?.toLowerCase() === "advanced").length}
            </p>
            <p className="text-sm text-muted-foreground">Advanced</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Courses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No courses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {course.image_url && (
                            <img
                              src={course.image_url}
                              alt={course.title}
                              className="h-10 w-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {course.duration}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{course.instructor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{course.level}</Badge>
                      </TableCell>
                      <TableCell>{course.category}</TableCell>
                      <TableCell>{course.enrolled_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onSelectCourse(course.id, course.title)
                            }
                          >
                            Modules
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onSelectRoadmap(course.id, course.title)
                            }
                          >
                            <Map className="h-4 w-4 mr-1" />
                            Roadmap
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(course)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCourseToDelete(course);
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

      {/* Course Form Dialog */}
      <AdminCourseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        course={selectedCourse}
        onSuccess={fetchCourses}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? This
              will also delete all modules and quiz questions. This action
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
