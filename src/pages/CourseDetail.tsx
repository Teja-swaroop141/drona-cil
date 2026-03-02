import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  Clock, 
  BookOpen, 
  ArrowLeft, 
  Users, 
  Award,
  CheckCircle2,
  Lock,
  Play,
  Pause,
  FileQuestion
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Quiz from "@/components/Quiz";
import CourseCertificate from "@/components/CourseCertificate";

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  instructor: string;
  duration: string;
  level: string;
  category: string;
  price: number;
  rating: number;
  enrolled_count: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_number: number;
  duration: string;
  is_preview: boolean;
  video_url?: string | null;
  has_quiz?: boolean;
  pass_percentage?: number | null;
  total_questions?: number | null;
  requires_passing?: boolean | null;
}

interface ModuleProgress {
  module_id: string;
  completed: boolean;
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [courseProgress, setCourseProgress] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [videoProgress, setVideoProgress] = useState<{ [moduleId: string]: number }>({});
  const [videoStartTime, setVideoStartTime] = useState<{ [moduleId: string]: number }>({});
  const [lastValidTime, setLastValidTime] = useState<{ [moduleId: string]: number }>({});
  const [isVideoPlaying, setIsVideoPlaying] = useState<{ [moduleId: string]: boolean }>({});
  const [hasStartedVideo, setHasStartedVideo] = useState<{ [moduleId: string]: boolean }>({});
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [hasPassedQuiz, setHasPassedQuiz] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchCourseDetails();
  }, [courseId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
  };

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch course modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules" as any)
        .select("*")
        .eq("course_id", courseId)
        .order("order_number", { ascending: true });

      if (modulesError) throw modulesError;
      const courseModules = (modulesData as any) || [];
      const courseModuleIds: string[] = courseModules.map((m: Module) => m.id);
      setModules(courseModules);

      // Check if user is enrolled
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: enrollment } = await supabase
          .from("user_enrollments")
          .select("id, progress")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();

        setIsEnrolled(!!enrollment);
        if (enrollment) {
          setCourseProgress(enrollment.progress || 0);

          // Fetch module progress only for this course
          let progressQuery: any = supabase
            .from("user_module_progress")
            .select("module_id, completed")
            .eq("user_id", user.id);

          if (courseModuleIds.length > 0) {
            progressQuery = progressQuery.in("module_id", courseModuleIds);
          }

          const { data: progressData } = await progressQuery;
          setModuleProgress(progressData || []);

          // Check if course is fully completed (all modules done)
          const completedModuleIds = (progressData || []).filter(p => p.completed).map(p => p.module_id);
          const allModulesCompleted = courseModuleIds.length > 0
            ? courseModuleIds.every((id) => completedModuleIds.includes(id))
            : false;
          setIsCourseCompleted(allModulesCompleted);

          // Check if user has passed any quiz for this course's modules
          const { data: passedQuizAttempts } = await supabase
            .from("quiz_attempts")
            .select("id")
            .eq("user_id", user.id)
            .in("module_id", courseModuleIds)
            .eq("passed", true)
            .limit(1);

          setHasPassedQuiz((passedQuizAttempts?.length || 0) > 0);
        }
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
      toast.error("Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("user_enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          progress: 0,
          completed: false
        });

      if (error) throw error;

      setIsEnrolled(true);
      toast.success("Successfully enrolled in the course!");
      
      // Note: enrolled_count is automatically updated by database trigger on user_enrollments
    } catch (error: any) {
      console.error("Error enrolling:", error);
      if (error.code === "23505") {
        toast.error("You are already enrolled in this course");
      } else {
        toast.error("Failed to enroll in course");
      }
    } finally {
      setEnrolling(false);
    }
  };

  const markModuleComplete = async (moduleId: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Prevent duplicate completion writes
      const alreadyCompleted = moduleProgress.some(p => p.module_id === moduleId && p.completed);
      if (alreadyCompleted) return;

      // Optimistically unlock the next module in UI
      setModuleProgress(prev => {
        const next = prev.filter(p => p.module_id !== moduleId);
        next.push({ module_id: moduleId, completed: true });
        return next;
      });

      const { error: upsertError } = await supabase
        .from("user_module_progress")
        .upsert(
          {
            user_id: user.id,
            module_id: moduleId,
            completed: true,
            completed_at: new Date().toISOString()
          },
          { onConflict: "user_id,module_id" }
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }

      // Recalculate progress (authoritative fetch for this course)
      const courseModuleIds = modules.map(m => m.id);
      let progressQuery: any = supabase
        .from("user_module_progress")
        .select("module_id, completed")
        .eq("user_id", user.id);

      if (courseModuleIds.length > 0) {
        progressQuery = progressQuery.in("module_id", courseModuleIds);
      }

      const { data: progressData, error: progressError } = await progressQuery;
      if (progressError) throw progressError;

      const safeProgressData = (progressData || []) as ModuleProgress[];
      setModuleProgress(safeProgressData);

      const completedCount = safeProgressData.filter(p => p.completed).length;
      const totalModules = modules.length;
      const newProgress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

      setCourseProgress(newProgress);

      // Check if all modules are now completed
      const completedModuleIds = safeProgressData.filter(p => p.completed).map(p => p.module_id);
      const allModulesCompleted = courseModuleIds.length > 0 && 
        courseModuleIds.every(id => completedModuleIds.includes(id));
      
      if (allModulesCompleted) {
        setIsCourseCompleted(true);
        
        // Check if user has passed any quiz for final assessment
        const { data: passedQuizAttempts } = await supabase
          .from("quiz_attempts")
          .select("id")
          .eq("user_id", user.id)
          .in("module_id", courseModuleIds)
          .eq("passed", true)
          .limit(1);
        
        const quizPassed = (passedQuizAttempts?.length || 0) > 0;
        setHasPassedQuiz(quizPassed);
        
        if (quizPassed) {
          toast.success("🎉 Congratulations! Course completed! Your certificate is now available.");
          // Scroll to certificate section after a short delay
          setTimeout(() => {
            document.getElementById('certificate-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 500);
        }
      }

      // Update enrollment progress (if we have a valid courseId)
      if (courseId) {
        const { error: enrollmentError } = await supabase
          .from("user_enrollments")
          .update({ progress: newProgress, completed: allModulesCompleted })
          .eq("user_id", user.id)
          .eq("course_id", courseId);

        if (enrollmentError) throw enrollmentError;
      }

      toast.success("Module completed! Next module unlocked.");
    } catch (error) {
      console.error("Error updating module progress:", error);
      toast.error("Failed to update progress");
    }
  };

  // Extract Google Drive file ID from various URL formats
  const getGoogleDriveFileId = (url: string): string | null => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Get Google Drive embed URL
  const getGoogleDriveEmbedUrl = (url: string): string | null => {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) {
      // Use the preview URL - autoplay doesn't work with Google Drive embeds
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return null;
  };

  // Parse duration string to seconds (e.g., "20 min" -> 1200, "00:08" -> 8)
  const parseDurationToSeconds = (duration: string): number => {
    const trimmed = (duration || "").trim();

    // Support mm:ss or hh:mm:ss
    const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (colonMatch) {
      const a = parseInt(colonMatch[1], 10);
      const b = parseInt(colonMatch[2], 10);
      const c = colonMatch[3] ? parseInt(colonMatch[3], 10) : null;
      // If 3 groups => hh:mm:ss; else => mm:ss
      return c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
    }

    const hrMatch = trimmed.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/i);
    const minMatch = trimmed.match(/(\d+)\s*(min|mins|minute|minutes)\b/i);
    const secMatch = trimmed.match(/(\d+)\s*(sec|secs|second|seconds|s)\b/i);

    let seconds = 0;
    if (hrMatch) seconds += parseInt(hrMatch[1], 10) * 3600;
    if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
    if (secMatch) seconds += parseInt(secMatch[1], 10);

    return seconds || 1200; // Default to 20 min if parsing fails
  };

  const formatSeconds = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Start tracking video watch time when module expands
  const handleModuleExpand = (module: Module, isExpanding: boolean) => {
    if (isExpanding && module.video_url && !isModuleCompleted(module.id)) {
      // Reset tracking state when opening a module
      setLastValidTime(prev => ({
        ...prev,
        [module.id]: 0
      }));
      setVideoProgress(prev => ({
        ...prev,
        [module.id]: 0
      }));
      setIsVideoPlaying(prev => ({
        ...prev,
        [module.id]: false
      }));
      setHasStartedVideo(prev => ({
        ...prev,
        [module.id]: false
      }));
    }
  };

  // Toggle video play/pause
  // NOTE: We can't directly control play/pause inside the Google Drive iframe.
  // Instead, we use a user action to (1) start the iframe with autoplay and (2) start the timer at the same moment.
  const toggleVideoPlayback = (moduleId: string) => {
    const isCurrentlyPlaying = isVideoPlaying[moduleId];

    if (!isCurrentlyPlaying) {
      // Starting: set autoplay on iframe + set timer start time
      setHasStartedVideo(prev => ({
        ...prev,
        [moduleId]: true
      }));

      const now = Date.now();
      const previouslyWatchedSeconds = lastValidTime[moduleId] || 0;
      setVideoStartTime(prev => ({
        ...prev,
        [moduleId]: now - (previouslyWatchedSeconds * 1000)
      }));
    }

    setIsVideoPlaying(prev => ({
      ...prev,
      [moduleId]: !isCurrentlyPlaying
    }));
  };

  // Anti-skip enforcement for Google Drive embeds is handled by blocking the seekbar area with an overlay.
  // (We avoid time-jump heuristics here because browsers can throttle timers in background tabs.)

  // Track video progress and auto-complete when the video duration ends
  useEffect(() => {
    if (!selectedModule || !selectedModule.video_url || isModuleCompleted(selectedModule.id)) {
      return;
    }

    const moduleId = selectedModule.id;
    const isPlaying = isVideoPlaying[moduleId];

    if (!isPlaying) {
      return; // Don't track if paused
    }

    const totalDuration = parseDurationToSeconds(selectedModule.duration);
    // Use full video duration for completion
    const requiredWatchTime = totalDuration;

    const interval = setInterval(() => {
      const startTime = videoStartTime[moduleId];
      if (!startTime) return;

      // Use wall-clock elapsed time so the timer stays synced even if setInterval is throttled.
      const watchedSeconds = Math.min(
        totalDuration,
        Math.floor((Date.now() - startTime) / 1000)
      );

      setLastValidTime(prev => ({
        ...prev,
        [moduleId]: watchedSeconds
      }));

      const progressPercent = totalDuration > 0
        ? Math.min(100, (watchedSeconds / totalDuration) * 100)
        : 0;

      setVideoProgress(prev => ({
        ...prev,
        [moduleId]: progressPercent
      }));

      if (watchedSeconds >= requiredWatchTime) {
        markModuleComplete(moduleId);
        setIsVideoPlaying(prev => ({ ...prev, [moduleId]: false }));
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [selectedModule, videoStartTime, moduleProgress, isVideoPlaying]);

  // Check if a module is unlocked (first module or previous module completed)
  const isModuleUnlocked = (moduleIndex: number) => {
    if (moduleIndex === 0) return true; // First module is always unlocked
    const previousModule = modules[moduleIndex - 1];
    return isModuleCompleted(previousModule.id);
  };

  const isModuleCompleted = (moduleId: string) => {
    return moduleProgress.some(p => p.module_id === moduleId && p.completed);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "intermediate": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "advanced": return "bg-red-500/10 text-red-700 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <p className="text-muted-foreground">Course not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Back Button */}
      <div className="container pt-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative py-12 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getLevelColor(course.level)}>
                  {course.level}
                </Badge>
                <Badge variant="outline">{course.category}</Badge>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold">{course.title}</h1>
              
              <p className="text-lg text-muted-foreground">{course.description}</p>
              
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{course.rating}</span>
                  <span className="text-muted-foreground">rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{course.enrolled_count || 0}</span>
                  <span className="text-muted-foreground">students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{course.duration}</span>
                  <span className="text-muted-foreground">duration</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm">Instructor: <span className="font-semibold">{course.instructor}</span></span>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 shadow-xl">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={course.image_url || "/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">₹{course.price.toLocaleString()}</p>
                  </div>
                  
                  {isEnrolled ? (
                    <div className="space-y-3">
                      <Button className="w-full" size="lg" disabled>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Already Enrolled
                      </Button>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Course Progress</span>
                          <span className="font-semibold">{courseProgress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${courseProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90" 
                      size="lg"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? "Enrolling..." : "Enroll Now"}
                    </Button>
                  )}

                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">This course includes:</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Lifetime access</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{modules.length} comprehensive modules</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Certificate of completion</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Interactive exercises</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Course Content / Roadmap */}
      <section className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Course Curriculum</CardTitle>
            <CardDescription>
              {modules.length} modules • Learn at your own pace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                {modules.map((module, index) => {
                const isUnlocked = isModuleUnlocked(index);
                const canAccess = (isEnrolled && isUnlocked) || module.is_preview;
                const isCompleted = isModuleCompleted(module.id);
                const hasVideo = module.video_url;
                const hasQuiz = module.has_quiz;
                const isQuizOnly = hasQuiz && !hasVideo;
                const isExpanded = selectedModule?.id === module.id;
                const isLocked = isEnrolled && !isUnlocked && !module.is_preview;
                const canExpand = canAccess && (hasVideo || isQuizOnly);

                const totalDurationSeconds = parseDurationToSeconds(module.duration);
                const watchedSeconds = Math.min(totalDurationSeconds, Math.floor(lastValidTime[module.id] || 0));
                const remainingSeconds = Math.max(0, totalDurationSeconds - watchedSeconds);
                
                return (
                  <div
                    key={module.id}
                    className={`border rounded-lg transition-colors ${
                      canExpand ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60'
                    } ${isExpanded ? 'bg-muted/50 border-primary' : ''} ${isLocked ? 'bg-muted/30' : ''}`}
                  >
                    <div
                      className={`p-4 ${canExpand ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      onClick={() => {
                        if (isLocked) {
                          toast.error("Complete the previous module to unlock this one");
                          return;
                        }
                        if (canExpand) {
                          const isExpanding = !isExpanded;
                          setSelectedModule(isExpanding ? module : null);
                          handleModuleExpand(module, isExpanding);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            isCompleted 
                              ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                              : isLocked 
                                ? 'bg-muted text-muted-foreground' 
                                : 'bg-primary/10 text-primary'
                          } font-semibold text-sm flex-shrink-0`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : isLocked ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-semibold ${isLocked ? 'text-muted-foreground' : ''}`}>
                                {module.title}
                              </h3>
                              {hasVideo && canAccess && (
                                <Badge variant="secondary" className="text-xs">
                                  <Play className="h-3 w-3 mr-1" />
                                  Video
                                </Badge>
                              )}
                              {isQuizOnly && canAccess && (
                                <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                                  <FileQuestion className="h-3 w-3 mr-1" />
                                  Final Assessment
                                </Badge>
                              )}
                              {hasQuiz && hasVideo && canAccess && (
                                <Badge variant="outline" className="text-xs">
                                  <FileQuestion className="h-3 w-3 mr-1" />
                                  Quiz
                                </Badge>
                              )}
                              {module.is_preview && (
                                <Badge variant="outline" className="text-xs">
                                  Preview
                                </Badge>
                              )}
                              {isLocked && (
                                <Badge variant="secondary" className="text-xs bg-muted">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                              {!isEnrolled && !module.is_preview && (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className={`text-sm ${isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                              {isLocked ? 'Complete the previous module to unlock' : module.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                          <Clock className="h-4 w-4" />
                          <span>{module.duration}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Video Section */}
                    {isExpanded && hasVideo && canAccess && (
                      <div className="px-4 pb-4 space-y-4">
                        <Separator />
                        <div className="space-y-4">
                          {/* Info banner */}
                          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
                            <Play className="h-4 w-4 flex-shrink-0" />
                            <span>Click on the video to start. Watch progress will track automatically.</span>
                          </div>
                          <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
                            {/* Clickable overlay to start tracking when user clicks to play */}
                            {!isVideoPlaying[module.id] && !isCompleted && (
                              <div 
                                className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVideoPlayback(module.id);
                                  toast.success("Video started! Watch progress is now tracking.", {
                                    id: "tracking-started",
                                    duration: 2000
                                  });
                                }}
                              >
                                <div className="bg-white/90 dark:bg-black/80 rounded-full p-5 shadow-lg hover:scale-110 transition-transform">
                                  <Play className="h-14 w-14 text-primary fill-primary" />
                                </div>
                              </div>
                            )}
                            {/* Google Drive Preview iframe */}
                            <iframe 
                              id={`video-iframe-${module.id}`}
                              src={getGoogleDriveEmbedUrl(module.video_url!)}
                              className="w-full h-full"
                              allow="autoplay; encrypted-media"
                              title={module.title}
                              allowFullScreen
                            />
                            {/* Overlay to block seek bar (bottom 60px) */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-black/90 to-black/40 cursor-not-allowed z-20"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toast.error("Seeking is disabled to maintain learning integrity.", {
                                  id: "seek-blocked",
                                  duration: 2000
                                });
                              }}
                            />
                          </div>
                          
                          {/* Progress Tracker */}
                          {!isCompleted && (
                            <div className="space-y-3">
                              {/* Pause button - only shown when playing */}
                              {isVideoPlaying[module.id] && (
                                <div className="flex justify-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleVideoPlayback(module.id);
                                    }}
                                    className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                  >
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause Tracking
                                  </Button>
                                </div>
                              )}
                              
                              {/* Progress indicator */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Watch Progress</span>
                                  <span>
                                    {formatSeconds(watchedSeconds)} / {formatSeconds(totalDurationSeconds)} ({Math.round(videoProgress[module.id] || 0)}%)
                                  </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${videoProgress[module.id] || 0}%` }}
                                  />
                                </div>
                                {isVideoPlaying[module.id] && (
                                  <p className="text-xs text-green-600 dark:text-green-400 text-center animate-pulse">
                                    ⏱ Tracking... {formatSeconds(remainingSeconds)} remaining
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Completed status */}
                          {isCompleted && (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="font-medium">Module Completed!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expanded Quiz-Only Section */}
                    {isExpanded && isQuizOnly && canAccess && (
                      <div className="px-4 pb-4 space-y-4">
                        <Separator />
                        <div className="space-y-4">
                          {!showQuiz ? (
                            <div className="p-6 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-orange-500 rounded-full">
                                  <FileQuestion className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">Final Assessment</h4>
                                  <p className="text-sm text-muted-foreground">Complete this quiz to finish the course</p>
                                </div>
                              </div>
                              {module.total_questions && (
                                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                                  <span><strong>{module.total_questions}</strong> Questions</span>
                                  {module.pass_percentage && (
                                    <span>Pass: <strong>{module.pass_percentage}%</strong></span>
                                  )}
                                </div>
                              )}
                              <Button 
                                className="w-full bg-orange-500 hover:bg-orange-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowQuiz(true);
                                }}
                              >
                                <FileQuestion className="h-4 w-4 mr-2" />
                                Start Assessment
                              </Button>
                            </div>
                          ) : (
                            <Quiz
                              moduleId={module.id}
                              moduleTitle={module.title}
                              passPercentage={module.pass_percentage || 70}
                              allowRetries={true}
                              showScoreAfterSubmission={true}
                              onQuizComplete={(passed) => {
                                if (passed) {
                                  markModuleComplete(module.id);
                                  setIsCourseCompleted(true);
                                  setHasPassedQuiz(true);
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Certificate Section - Always visible for enrolled users */}
        {isEnrolled && course && (
          <div id="certificate-section" className="mt-8">
            <Card className={`${!(courseProgress >= 100 && hasPassedQuiz) ? 'opacity-80' : ''}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${
                    courseProgress >= 100 && hasPassedQuiz 
                      ? 'bg-green-500' 
                      : 'bg-muted'
                  }`}>
                    {courseProgress >= 100 && hasPassedQuiz ? (
                      <Award className="h-6 w-6 text-white" />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">Certificate of Completion</CardTitle>
                    <CardDescription>
                      {courseProgress >= 100 && hasPassedQuiz 
                        ? "Congratulations! Your certificate is ready to download."
                        : "Complete all modules and pass the final assessment (70%) to unlock your certificate."
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {courseProgress >= 100 && hasPassedQuiz ? (
                  <CourseCertificate
                    courseId={course.id}
                    courseTitle={course.title}
                    courseDescription={course.description}
                    instructor={course.instructor}
                    courseDuration={course.duration}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Progress checklist */}
                    <div className="grid gap-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className={`p-1.5 rounded-full ${courseProgress >= 100 ? 'bg-green-500' : 'bg-muted-foreground/30'}`}>
                          {courseProgress >= 100 ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Complete all modules</p>
                          <p className="text-xs text-muted-foreground">{courseProgress}% completed</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className={`p-1.5 rounded-full ${hasPassedQuiz ? 'bg-green-500' : 'bg-muted-foreground/30'}`}>
                          {hasPassedQuiz ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Pass final assessment</p>
                          <p className="text-xs text-muted-foreground">
                            {hasPassedQuiz ? "Passed with 70% or higher" : "Score 70% or higher to pass"}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Locked certificate preview */}
                    <div className="relative p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 text-center">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-4 bg-background/90 rounded-full shadow-lg">
                          <Lock className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="opacity-30">
                        <Award className="h-16 w-16 mx-auto mb-4 text-primary" />
                        <h3 className="text-lg font-semibold">Certificate of Completion</h3>
                        <p className="text-sm text-muted-foreground">{course.title}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
};

export default CourseDetail;
