import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type RoleAssignment = {
    id: string;
    user_id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string;
};

export function AdminRolesTab() {
    const { toast } = useToast();
    const [roles, setRoles] = useState<RoleAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("admin");

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from("user_roles").select("*");
            if (error) throw error;
            setRoles(data || []);
        } catch (error: any) {
            console.error("Error fetching roles:", error);
            toast({
                title: "Error",
                description: "Failed to load role assignments",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.from("user_roles").insert({
                user_id: userId,
                role: role,
            });

            if (error) throw error;

            toast({
                title: "Role assigned",
                description: `Successfully assigned ${role} role.`,
            });

            setUserId("");
            fetchRoles();
        } catch (error: any) {
            console.error("Error assigning role:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to assign role",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveRole = async (id: string) => {
        try {
            const { error } = await supabase.from("user_roles").delete().eq("id", id);
            if (error) throw error;

            toast({
                title: "Role removed",
                description: "Successfully removed role assignment.",
            });

            fetchRoles();
        } catch (error: any) {
            console.error("Error removing role:", error);
            toast({
                title: "Error",
                description: "Failed to remove role",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Assign Role</CardTitle>
                        <CardDescription>Give administrative or expert access to a user via their ID.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAssignRole} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">User ID</label>
                                <Input
                                    placeholder="Paste User UUID here"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="expert">Subject Expert</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting || !userId}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Assign Role
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Current Role Assignments</CardTitle>
                        <Button variant="ghost" size="icon" onClick={fetchRoles} disabled={loading}>
                            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Assigned On</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {roles.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{r.name || "Unnamed"}</span>
                                                    <span className="text-xs text-muted-foreground">{r.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={r.role === "admin" ? "destructive" : "default"}>
                                                    {r.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(r.created_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveRole(r.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {roles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No custom roles assigned.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
