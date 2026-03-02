 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
import ciilEmblem from "@/assets/ciil-emblem.jpeg";

const Hero = () => {
   const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              Master Indian Languages & Earn National Certification
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Gain fluency in regional languages, prepare for NTS-I examinations,
              and unlock accredited certificates from the Central Institute of Indian
              Languages.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
             <Button 
               className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8 py-6 text-base"
               onClick={() => navigate("/courses")}
             >
                Explore Courses
              </Button>
             <Button 
               variant="outline" 
               className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-6 text-base font-semibold"
               onClick={() => navigate("/auth")}
             >
                Get Started
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="bg-card rounded-2xl shadow-lg p-12 border relative overflow-hidden">
              <img 
                src={ciilEmblem} 
                alt="CIIL Emblem" 
                className="w-64 h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
