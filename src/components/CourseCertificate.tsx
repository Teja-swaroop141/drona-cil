import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Award, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ntsLogo from "@/assets/nts-logo.jpeg";
import ashokaEmblem from "@/assets/ashoka-emblem.jpeg";

interface CourseCertificateProps {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  instructor: string;
  courseDuration: string;
}

interface CertificateData {
  userName: string;
  enrolledAt: string;
  completedAt: string;
  quizScore: number;
  totalQuestions: number;
}

const CourseCertificate = ({
  courseId,
  courseTitle,
  courseDescription,
  instructor,
  courseDuration,
}: CourseCertificateProps) => {
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificateData();
  }, [courseId]);

  const fetchCertificateData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, name")
        .eq("id", user.id)
        .single();

      // Fetch enrollment details
      const { data: enrollment } = await supabase
        .from("user_enrollments")
        .select("enrolled_at")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .single();

      // Fetch course modules for this course
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);

      const moduleIds = modules?.map(m => m.id) || [];

      // Fetch latest quiz attempt for the final assessment
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions, created_at, passed")
        .eq("user_id", user.id)
        .in("module_id", moduleIds)
        .eq("passed", true)
        .order("created_at", { ascending: false })
        .limit(1);

      // Fetch latest module completion date
      const { data: moduleProgress } = await supabase
        .from("user_module_progress")
        .select("completed_at")
        .eq("user_id", user.id)
        .in("module_id", moduleIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1);

      const userName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.name || "Student";

      const quizAttempt = quizAttempts?.[0];

      setCertificateData({
        userName,
        enrolledAt: enrollment?.enrolled_at || new Date().toISOString(),
        completedAt: moduleProgress?.[0]?.completed_at || quizAttempt?.created_at || new Date().toISOString(),
        quizScore: quizAttempt?.score || 0,
        totalQuestions: quizAttempt?.total_questions || 10,
      });
    } catch (error) {
      console.error("Error fetching certificate data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const calculatePercentage = () => {
    if (!certificateData) return 0;
    return Math.round((certificateData.quizScore / certificateData.totalQuestions) * 100);
  };

  const downloadCertificate = () => {
    if (!certificateData) return;

    // Create a canvas for the certificate
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size (A4 landscape-ish dimensions)
    canvas.width = 1200;
    canvas.height = 850;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#fef9e7");
    gradient.addColorStop(1, "#fdf5e6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load both images and draw when ready
    let imagesLoaded = 0;
    const watermarkImg = new Image();
    const ntsImg = new Image();
    const ashokaImg = new Image();
    
    const checkAndDraw = () => {
      imagesLoaded++;
      if (imagesLoaded >= 2) {
        // Draw watermark (Ashoka emblem) - large and faded in background
        ctx.save();
        ctx.globalAlpha = 0.08;
        const watermarkSize = 500;
        const watermarkX = (canvas.width - watermarkSize) / 2;
        const watermarkY = (canvas.height - watermarkSize) / 2;
        ctx.drawImage(ashokaImg, watermarkX, watermarkY, watermarkSize, watermarkSize);
        ctx.restore();

        // Border design
        ctx.strokeStyle = "#c9a227";
        ctx.lineWidth = 8;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
        
        ctx.strokeStyle = "#8b6914";
        ctx.lineWidth = 2;
        ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

        // Inner decorative border
        ctx.strokeStyle = "#daa520";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);
        ctx.setLineDash([]);

        // Draw NTS logo at top left
        const ntsLogoSize = 90;
        ctx.drawImage(ntsImg, 80, 60, ntsLogoSize, ntsLogoSize);

        // Draw Ashoka emblem at top right
        const ashokaSize = 80;
        ctx.drawImage(ashokaImg, canvas.width - 80 - ashokaSize, 65, ashokaSize, ashokaSize);

        finishDrawing();
      }
    };

    ntsImg.crossOrigin = "anonymous";
    ntsImg.onload = checkAndDraw;
    ntsImg.onerror = checkAndDraw;
    ntsImg.src = ntsLogo;

    ashokaImg.crossOrigin = "anonymous";
    ashokaImg.onload = checkAndDraw;
    ashokaImg.onerror = checkAndDraw;
    ashokaImg.src = ashokaEmblem;

    const finishDrawing = () => {
      // Title
      ctx.fillStyle = "#1a365d";
      ctx.font = "bold 42px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("CERTIFICATE OF COMPLETION", canvas.width / 2, 195);

      // Decorative line
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(350, 215);
      ctx.lineTo(850, 215);
      ctx.stroke();

      // Subtitle
      ctx.fillStyle = "#4a5568";
      ctx.font = "italic 18px Georgia, serif";
      ctx.fillText("This is to certify that", canvas.width / 2, 265);

      // Name
      ctx.fillStyle = "#1a365d";
      ctx.font = "bold 38px Georgia, serif";
      ctx.fillText(certificateData!.userName, canvas.width / 2, 320);

      // Underline for name
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const nameWidth = ctx.measureText(certificateData!.userName).width;
      ctx.moveTo((canvas.width - nameWidth) / 2 - 20, 335);
      ctx.lineTo((canvas.width + nameWidth) / 2 + 20, 335);
      ctx.stroke();

      // Completion text
      ctx.fillStyle = "#4a5568";
      ctx.font = "italic 18px Georgia, serif";
      ctx.fillText("has successfully completed the course", canvas.width / 2, 380);

      // Course title
      ctx.fillStyle = "#2d3748";
      ctx.font = "bold 28px Georgia, serif";
      
      // Wrap course title if too long
      const maxWidth = 800;
      const words = courseTitle.split(' ');
      let line = '';
      let y = 425;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), canvas.width / 2, y);
          line = words[n] + ' ';
          y += 35;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), canvas.width / 2, y);

      // Score section
      const scoreY = y + 60;
      ctx.fillStyle = "#2d5016";
      ctx.font = "bold 22px Georgia, serif";
      ctx.fillText(`Score: ${calculatePercentage()}%`, canvas.width / 2, scoreY);

      // Duration info
      ctx.fillStyle = "#4a5568";
      ctx.font = "16px Georgia, serif";
      ctx.fillText(`Course Duration: ${courseDuration}`, canvas.width / 2, scoreY + 35);

      // Date range
      const dateY = scoreY + 70;
      ctx.font = "15px Georgia, serif";
      ctx.fillText(
        `Started: ${formatDate(certificateData!.enrolledAt)} | Completed: ${formatDate(certificateData!.completedAt)}`,
        canvas.width / 2,
        dateY
      );

      // Course description (truncated)
      ctx.font = "italic 14px Georgia, serif";
      ctx.fillStyle = "#718096";
      const truncatedDesc = courseDescription.length > 120 
        ? courseDescription.substring(0, 120) + "..." 
        : courseDescription;
      
      // Wrap description
      const descWords = truncatedDesc.split(' ');
      let descLine = '';
      let descY = dateY + 35;
      const descMaxWidth = 700;
      
      for (let n = 0; n < descWords.length; n++) {
        const testLine = descLine + descWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > descMaxWidth && n > 0) {
          ctx.fillText(descLine.trim(), canvas.width / 2, descY);
          descLine = descWords[n] + ' ';
          descY += 20;
        } else {
          descLine = testLine;
        }
      }
      ctx.fillText(descLine.trim(), canvas.width / 2, descY);

      // Instructor and signature section
      const signatureY = canvas.height - 120;
      
      // Left side - Instructor
      ctx.fillStyle = "#1a365d";
      ctx.font = "16px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(instructor, 300, signatureY);
      ctx.strokeStyle = "#4a5568";
      ctx.beginPath();
      ctx.moveTo(180, signatureY - 25);
      ctx.lineTo(420, signatureY - 25);
      ctx.stroke();
      ctx.fillStyle = "#718096";
      ctx.font = "14px Georgia, serif";
      ctx.fillText("Course Instructor", 300, signatureY + 20);

      // Right side - Organization
      ctx.fillStyle = "#1a365d";
      ctx.font = "16px Georgia, serif";
      ctx.fillText("National Translation Mission", 900, signatureY);
      ctx.beginPath();
      ctx.moveTo(780, signatureY - 25);
      ctx.lineTo(1020, signatureY - 25);
      ctx.stroke();
      ctx.fillStyle = "#718096";
      ctx.font = "14px Georgia, serif";
      ctx.fillText("Authorized Signatory", 900, signatureY + 20);

      // Certificate ID
      ctx.fillStyle = "#a0aec0";
      ctx.font = "11px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `Certificate ID: NTM-${courseId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        canvas.width / 2,
        canvas.height - 45
      );

      // Download the canvas as image
      const link = document.createElement("a");
      link.download = `Certificate-${courseTitle.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-12 w-12 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-500 rounded-full flex-shrink-0">
          <Award className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">
              Congratulations! 🎉
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You have successfully completed all modules and passed the final assessment.
            </p>
          </div>
          
          {certificateData && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>Score: <strong>{calculatePercentage()}%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed: <strong>{formatDate(certificateData.completedAt)}</strong></span>
              </div>
            </div>
          )}

          <Button 
            onClick={downloadCertificate}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CourseCertificate;
