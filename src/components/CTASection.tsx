import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-[hsl(var(--cta-bg))]">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-[hsl(var(--cta-text))] mb-4">
          The Next Level of Digital Learning
        </h2>
        <p className="text-lg text-[hsl(var(--cta-text))]/90 mb-8 max-w-3xl mx-auto">
          Start your free 7 day trial and access thousands of videos, quizzes, and projects to validate
          your skills.
        </p>
        <Button 
          className="bg-white hover:bg-gray-100 text-[hsl(var(--cta-bg))] px-8 py-6 text-base font-semibold"
          onClick={() => navigate("/auth")}
        >
          Sign Up Now
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
