import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { AdminQuizForm } from "./AdminQuizForm";

type Question = {
  id: string;
  module_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_number: number;
};

interface AdminQuestionsTabProps {
  moduleId: string;
  moduleTitle: string;
  onBack: () => void;
}

export function AdminQuestionsTab({
  moduleId,
  moduleTitle,
  onBack,
}: AdminQuestionsTabProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_number", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error("Error fetching questions:", error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [moduleId]);

  const handleEdit = (question: Question) => {
    setSelectedQuestion(question);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionToDelete.id);

      if (error) throw error;
      toast({ title: "Question deleted successfully" });
      fetchQuestions();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete question",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  const getCorrectAnswerText = (question: Question) => {
    switch (question.correct_answer) {
      case "A":
        return question.option_a;
      case "B":
        return question.option_b;
      case "C":
        return question.option_c;
      case "D":
        return question.option_d;
      default:
        return "";
    }
  };

  const nextOrderNumber =
    questions.length > 0
      ? Math.max(...questions.map((q) => q.order_number)) + 1
      : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Quiz Questions</h2>
            <p className="text-sm text-muted-foreground">{moduleTitle}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedQuestion(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-2xl font-bold">{questions.length}</p>
          <p className="text-sm text-muted-foreground">Total Questions</p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Questions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No questions found. Add your first question to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Correct Answer</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        {question.order_number}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-md truncate">
                          {question.question_text}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {question.correct_answer}
                          </Badge>
                          <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                            {getCorrectAnswerText(question)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(question)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setQuestionToDelete(question);
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

      {/* Question Form Dialog */}
      <AdminQuizForm
        open={formOpen}
        onOpenChange={setFormOpen}
        moduleId={moduleId}
        question={selectedQuestion}
        onSuccess={fetchQuestions}
        nextOrderNumber={nextOrderNumber}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
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
