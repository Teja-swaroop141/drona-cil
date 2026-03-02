 import { useNavigate } from "react-router-dom";
 import { Star, ArrowRight } from "lucide-react";

interface CourseCardProps {
  code: string;
  codeColor: string;
  bgColor: string;
  university: string;
  title: string;
  description: string;
  rating: number;
  reviews: string;
  type: string;
  typeColor: string;
   onClick?: () => void;
}

const CourseCard = ({
  code,
  codeColor,
  bgColor,
  university,
  title,
  description,
  rating,
  reviews,
  type,
  typeColor,
   onClick,
}: CourseCardProps) => {
   const navigate = useNavigate();
 
   const handleClick = () => {
     if (onClick) {
       onClick();
     } else {
       navigate("/courses");
     }
   };
 
  return (
     <div 
       className="bg-card rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
       onClick={handleClick}
     >
      <div className={`${bgColor} py-12 flex items-center justify-center`}>
        <h3 className={`text-4xl font-bold ${codeColor}`}>{code}</h3>
      </div>
      
      <div className="p-6 space-y-3">
        <p className="text-xs text-muted-foreground">{university}</p>
        <h4 className="font-semibold text-foreground text-base">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        
        <div className="flex items-center gap-1 pt-2">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-sm">{rating}</span>
          <span className="text-xs text-muted-foreground">({reviews} reviews)</span>
        </div>
        
         <div className="flex items-center justify-between pt-2">
           <p className={`text-sm font-semibold ${typeColor}`}>{type}</p>
           <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
         </div>
      </div>
    </div>
  );
};

export default CourseCard;
