import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw,
  Trophy,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_number: number;
}

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  passed: boolean;
  created_at: string;
}

interface QuizProps {
  moduleId: string;
  moduleTitle: string;
  passPercentage: number;
  allowRetries: boolean;
  showScoreAfterSubmission: boolean;
  onQuizComplete: (passed: boolean) => void;
}

const Quiz = ({ 
  moduleId, 
  moduleTitle, 
  passPercentage, 
  allowRetries,
  showScoreAfterSubmission,
  onQuizComplete 
}: QuizProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [hasPassed, setHasPassed] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchPreviousAttempts();
  }, [moduleId]);

  const fetchQuestions = async () => {
    try {
      // Use the RPC function that returns questions without correct_answer
      const { data, error } = await supabase
        .rpc("get_quiz_questions", { p_module_id: moduleId });

      if (error) throw error;
      // Questions from RPC don't have correct_answer - that's handled server-side during grading
      setQuestions((data || []).map((q: any) => ({ ...q, correct_answer: '' })));
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load quiz questions");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousAttempts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("module_id", moduleId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPreviousAttempts(data || []);
      
      // Check if user has already passed
      const passedAttempt = data?.find(attempt => attempt.passed);
      if (passedAttempt) {
        setHasPassed(true);
        setQuizCompleted(true);
        setResult({
          score: passedAttempt.score,
          total: passedAttempt.total_questions,
          passed: true
        });
      }
    } catch (error) {
      console.error("Error fetching previous attempts:", error);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to submit the quiz");
        return;
      }

      // Grade quiz server-side to prevent cheating
      const response = await supabase.functions.invoke('grade-quiz', {
        body: { moduleId, answers }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to grade quiz');
      }

      const { score, totalQuestions, passed } = response.data;

      setResult({ score, total: totalQuestions, passed });
      setQuizCompleted(true);

      if (passed) {
        setHasPassed(true);
        onQuizComplete(true);
        toast.success("Congratulations! You passed the quiz!");
      } else {
        toast.error(`You need ${passPercentage}% to pass. Try again!`);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setQuizCompleted(false);
    setResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No questions available for this quiz.</p>
        </CardContent>
      </Card>
    );
  }

  // Quiz completed - show results
  if (quizCompleted && result) {
    const scorePercentage = Math.round((result.score / result.total) * 100);
    
    return (
      <Card className={`border-2 ${result.passed ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {result.passed ? (
              <div className="p-4 bg-green-500 rounded-full">
                <Trophy className="h-10 w-10 text-white" />
              </div>
            ) : (
              <div className="p-4 bg-orange-500 rounded-full">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>
            )}
          </div>
          <CardTitle className={`text-2xl ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {result.passed ? "Congratulations! You Passed!" : "Keep Trying!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showScoreAfterSubmission && (
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold">
                {result.score} / {result.total}
              </p>
              <p className="text-lg text-muted-foreground">
                Your Score: <span className="font-semibold">{scorePercentage}%</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Required to pass: {passPercentage}%
              </p>
            </div>
          )}

          {result.passed ? (
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                You have successfully completed the assessment!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allowRetries ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Don't worry! You can retry the quiz.
                  </p>
                  <Button onClick={handleRetry} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Retry Quiz
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Unfortunately, retries are not allowed for this quiz.
                </p>
              )}
            </div>
          )}

          {previousAttempts.length > 1 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Previous Attempts:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {previousAttempts.slice(0, 5).map((attempt, idx) => (
                  <div key={attempt.id} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded">
                    <span className="text-muted-foreground">
                      Attempt {previousAttempts.length - idx}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{attempt.score}/{attempt.total_questions}</span>
                      {attempt.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <Card className="border-2 border-orange-200 dark:border-orange-800">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{moduleTitle}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {answeredCount}/{questions.length} answered
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-4">
          <p className="text-lg font-medium leading-relaxed">
            {currentQuestion.question_text}
          </p>

          {/* Options */}
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
            className="space-y-3"
          >
            {[
              { key: "A", value: currentQuestion.option_a },
              { key: "B", value: currentQuestion.option_b },
              { key: "C", value: currentQuestion.option_c },
              { key: "D", value: currentQuestion.option_d },
            ].map((option) => (
              <div
                key={option.key}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  answers[currentQuestion.id] === option.key
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50 hover:bg-muted/50"
                }`}
                onClick={() => handleAnswerSelect(currentQuestion.id, option.key)}
              >
                <RadioGroupItem value={option.key} id={`${currentQuestion.id}-${option.key}`} />
                <Label 
                  htmlFor={`${currentQuestion.id}-${option.key}`}
                  className="flex-1 cursor-pointer text-base"
                >
                  <span className="font-semibold mr-2">{option.key}.</span>
                  {option.value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? "bg-primary w-6"
                    : answers[questions[idx].id]
                      ? "bg-green-500"
                      : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!allAnswered || submitting}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Quiz
                </>
              )}
            </Button>
          )}
        </div>

        {!allAnswered && currentIndex === questions.length - 1 && (
          <p className="text-sm text-center text-muted-foreground">
            Please answer all questions before submitting
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default Quiz;
