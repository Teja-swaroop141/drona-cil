 import { useEffect, useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Star, Clock, Lock } from "lucide-react";
 import { toast } from "sonner";
 import Header from "@/components/Header";
 
 interface Course {
   id: string;
   title: string;
   description: string;
   image_url: string | null;
   instructor: string;
   duration: string;
   level: string;
   category: string;
   rating: number;
 }
 
 const Courses = () => {
   const navigate = useNavigate();
   const [courses, setCourses] = useState<Course[]>([]);
   const [loading, setLoading] = useState(true);
   const [isAuthenticated, setIsAuthenticated] = useState(false);
 
   useEffect(() => {
     checkAuth();
     fetchCourses();
   }, []);
 
   const checkAuth = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     setIsAuthenticated(!!user);
   };
 
   const fetchCourses = async () => {
     try {
       const { data, error } = await supabase
         .from("courses")
         .select("id, title, description, image_url, instructor, duration, level, category, rating")
         .order("rating", { ascending: false });
 
       if (error) throw error;
       setCourses(data || []);
     } catch (error) {
       console.error("Error fetching courses:", error);
       toast.error("Failed to load courses");
     } finally {
       setLoading(false);
     }
   };
 
   const handleCourseClick = (courseId: string) => {
     if (isAuthenticated) {
       navigate(`/courses/${courseId}`);
     } else {
       toast.info("Please sign in to access course details and roadmaps");
       navigate("/auth");
     }
   };
 
   const getLevelColor = (level: string) => {
     switch (level) {
       case "beginner": return "bg-green-500/10 text-green-700 dark:text-green-400";
       case "intermediate": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
       case "advanced": return "bg-red-500/10 text-red-700 dark:text-red-400";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   return (
     <div className="min-h-screen bg-background">
       <Header />
       
       <section className="py-12 lg:py-16">
         <div className="container mx-auto px-6">
           <div className="text-center mb-12">
             <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
               Explore Our Courses
             </h1>
             <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
               Discover a wide range of Indian language courses designed by experts from NTS and CIIL.
               {!isAuthenticated && (
                 <span className="block mt-2 text-primary font-medium">
                   Sign in to access full course details and learning roadmaps.
                 </span>
               )}
             </p>
           </div>
 
           {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[...Array(6)].map((_, i) => (
                 <Card key={i} className="overflow-hidden animate-pulse">
                   <div className="w-full h-48 bg-muted" />
                   <CardHeader>
                     <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                     <div className="h-4 bg-muted rounded w-1/2" />
                   </CardHeader>
                 </Card>
               ))}
             </div>
           ) : courses.length === 0 ? (
             <Card className="p-12 text-center">
               <p className="text-muted-foreground">No courses available at the moment.</p>
             </Card>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {courses.map((course) => (
                 <Card 
                   key={course.id} 
                   className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative"
                   onClick={() => handleCourseClick(course.id)}
                 >
                   <div className="relative overflow-hidden h-48">
                     <img
                       src={course.image_url || "/placeholder.svg"}
                       alt={course.title}
                       className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                     />
                     <div className="absolute top-4 right-4">
                       <Badge className={getLevelColor(course.level)}>
                         {course.level}
                       </Badge>
                     </div>
                     {!isAuthenticated && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="text-white text-center">
                           <Lock className="h-8 w-8 mx-auto mb-2" />
                           <p className="text-sm font-medium">Sign in to access</p>
                         </div>
                       </div>
                     )}
                   </div>
                   <CardHeader>
                     <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
                     <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="space-y-3">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <span className="font-medium text-foreground">{course.instructor}</span>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                         <div className="flex items-center gap-1">
                           <Clock className="h-4 w-4 text-muted-foreground" />
                           <span className="text-muted-foreground">{course.duration}</span>
                         </div>
                         <div className="flex items-center gap-1">
                           <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                           <span className="font-medium">{course.rating}</span>
                         </div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
 
           {!isAuthenticated && (
             <div className="mt-12 text-center">
               <Button 
                 className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base font-semibold"
                 onClick={() => navigate("/auth")}
               >
                 Sign Up to Get Started
               </Button>
             </div>
           )}
         </div>
       </section>
     </div>
   );
 };
 
 export default Courses;