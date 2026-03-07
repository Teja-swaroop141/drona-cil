import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type QuizAttempt = {
    id: string;
    user_email: string;
    user_name: string | null;
    module_title: string;
    score: number;
    total_questions: number;
    created_at: string;
};

export function AdminQuizAttemptsTab() {
    const { toast } = useToast();
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAttempts = async () => {
        setLoading(true);
        try {
            // Note: Use the admin-specific mapping to get all attempts
            const { data, error } = await supabase
                .from("admin_quiz_attempts")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // The backend returns qa.*, u.email, p.name, cm.title as module_title
            // We need to map these to our type
            const mappedData = (data as any[] || []).map(item => ({
                id: item.id,
                user_email: item.email,
                user_name: item.name,
                module_title: item.module_title,
                score: item.score,
                total_questions: item.total_questions,
                created_at: item.created_at,
            }));

            setAttempts(mappedData);
        } catch (error: any) {
            console.error("Error fetching attempts:", error);
            toast({
                title: "Error",
                description: "Failed to load quiz attempts",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttempts();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAttempts}
                    disabled={loading}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Quiz Attempts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : attempts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No quiz attempts recorded yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Module</TableHead>
                                        <TableHead>Score</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attempts.map((attempt) => {
                                        const percentage = (attempt.score / attempt.total_questions) * 100;
                                        const passed = percentage >= 70;

                                        return (
                                            <TableRow key={attempt.id}>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {format(new Date(attempt.created_at), "MMM d, HH:mm")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{attempt.user_name || "Unnamed"}</span>
                                                        <span className="text-xs text-muted-foreground">{attempt.user_email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {attempt.module_title}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-bold">{attempt.score}</span> / {attempt.total_questions}
                                                    <span className="ml-2 text-xs text-muted-foreground">({Math.round(percentage)}%)</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={passed ? "default" : "destructive"} className={passed ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" : ""}>
                                                        {passed ? "Passed" : "Failed"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
