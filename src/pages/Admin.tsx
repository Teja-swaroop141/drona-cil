import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { AdminCoursesTab } from "@/components/admin/AdminCoursesTab";
import { AdminModulesTab } from "@/components/admin/AdminModulesTab";
import { AdminQuestionsTab } from "@/components/admin/AdminQuestionsTab";
import { AdminContactsTab } from "@/components/admin/AdminContactsTab";
import { AdminRoadmapTab } from "@/components/admin/AdminRoadmapTab";

type ViewState =
  | { type: "courses" }
  | { type: "modules"; courseId: string; courseTitle: string }
  | { type: "questions"; moduleId: string; moduleTitle: string; courseId: string; courseTitle: string }
  | { type: "roadmap"; courseId: string; courseTitle: string };

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState("courses");
  const [viewState, setViewState] = useState<ViewState>({ type: "courses" });

  // Loading state
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Unauthorized
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <Button onClick={() => navigate("/dashboard")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleSelectCourse = (courseId: string, courseTitle: string) => {
    setViewState({ type: "modules", courseId, courseTitle });
  };

  const handleSelectRoadmap = (courseId: string, courseTitle: string) => {
    setViewState({ type: "roadmap", courseId, courseTitle });
  };

  const handleSelectModule = (moduleId: string, moduleTitle: string) => {
    if (viewState.type === "modules") {
      setViewState({
        type: "questions",
        moduleId,
        moduleTitle,
        courseId: viewState.courseId,
        courseTitle: viewState.courseTitle,
      });
    }
  };

  const handleBackToModules = () => {
    if (viewState.type === "questions") {
      setViewState({
        type: "modules",
        courseId: viewState.courseId,
        courseTitle: viewState.courseTitle,
      });
    }
  };

  const handleBackToCourses = () => {
    setViewState({ type: "courses" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <h1 className="text-xl font-semibold text-foreground">
              Admin Panel
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value === "courses") {
            setViewState({ type: "courses" });
          }
        }}>
          <TabsList className="mb-6">
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {viewState.type === "courses" && (
              <AdminCoursesTab 
                onSelectCourse={handleSelectCourse} 
                onSelectRoadmap={handleSelectRoadmap}
              />
            )}
            {viewState.type === "modules" && (
              <AdminModulesTab
                courseId={viewState.courseId}
                courseTitle={viewState.courseTitle}
                onBack={handleBackToCourses}
                onSelectModule={handleSelectModule}
              />
            )}
            {viewState.type === "questions" && (
              <AdminQuestionsTab
                moduleId={viewState.moduleId}
                moduleTitle={viewState.moduleTitle}
                onBack={handleBackToModules}
              />
            )}
            {viewState.type === "roadmap" && (
              <AdminRoadmapTab
                courseId={viewState.courseId}
                courseTitle={viewState.courseTitle}
                onBack={handleBackToCourses}
              />
            )}
          </TabsContent>

          <TabsContent value="contacts">
            <AdminContactsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}