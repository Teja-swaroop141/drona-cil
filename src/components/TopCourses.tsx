 import { useNavigate } from "react-router-dom";
import CourseCard from "./CourseCard";

const TopCourses = () => {
   const navigate = useNavigate();
 
  const courses = [
    {
      code: "HIN",
      codeColor: "text-[#0d8b92]",
      bgColor: "bg-[hsl(var(--card-hin))]",
      university: "Jawaharlal Nehru University",
      title: "Advanced Proficiency in Hindi (Level B2)",
      description: "Focus on literary analysis and professional writing",
      rating: 4.7,
      reviews: "6.1k",
      type: "Certificate Course",
      typeColor: "text-[#0d8b92]",
    },
    {
      code: "TAM",
      codeColor: "text-[#4169E1]",
      bgColor: "bg-[hsl(var(--card-tam))]",
      university: "CIIL Mysore",
      title: "Foundations of Tamil: Grammar & Conversation",
      description: "Learn to read the script and handle basic dialogue",
      rating: 4.5,
      reviews: "8.9k",
      type: "Specialization",
      typeColor: "text-[#4169E1]",
    },
    {
      code: "KAN",
      codeColor: "text-[#2d8659]",
      bgColor: "bg-[hsl(var(--card-kan))]",
      university: "NTS-I Certification Program",
      title: "Mastering the Kannada Script and Reading",
      description: "A short course focused on comprehensive reading skills",
      rating: 4.8,
      reviews: "3.2k",
      type: "Professional Certificate",
      typeColor: "text-[#2d8659]",
    },
    {
      code: "TEST",
      codeColor: "text-[#DC143C]",
      bgColor: "bg-[hsl(var(--card-test))]",
      university: "National Testing Service",
      title: "NTS Language Aptitude Test Prep 2024",
      description: "Full syllabus coverage, practice exams, and doubt solving",
      rating: 4.6,
      reviews: "6.8k",
      type: "Exam Preparation",
      typeColor: "text-[#DC143C]",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-3">
            Top Rated Language Programs
          </h2>
          <p className="text-muted-foreground text-lg">
            Courses taught by experts from NTS and CIIL research wings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {courses.map((course, index) => (
            <CourseCard key={index} {...course} />
          ))}
        </div>

         <p className="text-center text-muted-foreground mt-8 italic">
           "One language sets you in a corridor for life. Two languages open every door along the way."
         </p>
         <p className="text-center text-xs text-muted-foreground mt-2">
           — Frank Smith
         </p>
      </div>
    </section>
  );
};

export default TopCourses;
