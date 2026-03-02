import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const questionSchema = z.object({
  question_text: z.string().min(5, "Question must be at least 5 characters"),
  option_a: z.string().min(1, "Option A is required"),
  option_b: z.string().min(1, "Option B is required"),
  option_c: z.string().min(1, "Option C is required"),
  option_d: z.string().min(1, "Option D is required"),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  order_number: z.coerce.number().min(1, "Order must be at least 1"),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

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

interface AdminQuizFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  question?: Question | null;
  onSuccess: () => void;
  nextOrderNumber: number;
}

export function AdminQuizForm({
  open,
  onOpenChange,
  moduleId,
  question,
  onSuccess,
  nextOrderNumber,
}: AdminQuizFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_text: question?.question_text || "",
      option_a: question?.option_a || "",
      option_b: question?.option_b || "",
      option_c: question?.option_c || "",
      option_d: question?.option_d || "",
      correct_answer: (question?.correct_answer as "A" | "B" | "C" | "D") || "A",
      order_number: question?.order_number || nextOrderNumber,
    },
  });

  const onSubmit = async (values: QuestionFormValues) => {
    setLoading(true);
    try {
      const questionData = {
        module_id: moduleId,
        question_text: values.question_text,
        option_a: values.option_a,
        option_b: values.option_b,
        option_c: values.option_c,
        option_d: values.option_d,
        correct_answer: values.correct_answer,
        order_number: values.order_number,
      };

      if (question) {
        const { error } = await supabase
          .from("quiz_questions")
          .update(questionData)
          .eq("id", question.id);

        if (error) throw error;
        toast({ title: "Question updated successfully" });
      } else {
        const { error } = await supabase
          .from("quiz_questions")
          .insert(questionData);

        if (error) throw error;
        toast({ title: "Question created successfully" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save question",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? "Edit Question" : "Add New Question"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your question"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="option_a"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option A</FormLabel>
                    <FormControl>
                      <Input placeholder="Option A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="option_b"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option B</FormLabel>
                    <FormControl>
                      <Input placeholder="Option B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="option_c"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option C</FormLabel>
                    <FormControl>
                      <Input placeholder="Option C" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="option_d"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option D</FormLabel>
                    <FormControl>
                      <Input placeholder="Option D" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">Option A</SelectItem>
                        <SelectItem value="B">Option B</SelectItem>
                        <SelectItem value="C">Option C</SelectItem>
                        <SelectItem value="D">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {question ? "Update Question" : "Add Question"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
