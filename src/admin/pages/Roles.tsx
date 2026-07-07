import React, { FormEvent, useEffect, useState } from "react";
import { Plus, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Role {
  id: number;
  code: "admin" | "staff" | "sk" | "youth";
  label: string;
  description: string;
  created_at: string;
}

type RoleForm = {
  code: Role["code"];
  label: string;
  description: string;
};

const ROLE_CODES: Array<Role["code"]> = ["admin", "staff", "sk", "youth"];

const defaultForm: RoleForm = {
  code: "staff",
  label: "",
  description: "",
};

export const Roles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<RoleForm>(defaultForm);
  const { toast } = useToast();

  const loadRoles = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.from("roles").select("*").order("id", { ascending: true });
    if (error) {
      toast({ title: "Load Failed", description: error.message });
      setRoles([]);
      setIsLoading(false);
      return;
    }

    setRoles((data ?? []) as Role[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setForm(defaultForm);
    setIsFormOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setForm({
      code: role.code,
      label: role.label ?? "",
      description: role.description ?? "",
    });
    setIsFormOpen(true);
  };

  const openDeleteModal = (role: Role) => {
    setDeletingRole(role);
    setIsDeleteDialogOpen(true);
  };

  const openDetailsModal = (role: Role) => {
    setViewingRole(role);
    setIsDetailsOpen(true);
  };

  const saveRole = async (event: FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    if (!form.label.trim()) {
      toast({ title: "Missing Label", description: "Role label is required." });
      return;
    }

    setIsSaving(true);
    const payload = {
      code: form.code,
      label: form.label.trim(),
      description: form.description.trim() || null,
    };

    let error: { message: string } | null = null;
    if (editingRole) {
      const result = await supabase.from("roles").update(payload).eq("id", editingRole.id);
      error = result.error;
    } else {
      const result = await supabase.from("roles").insert(payload);
      error = result.error;
    }

    setIsSaving(false);
    if (error) {
      toast({ title: "Save Failed", description: error.message });
      return;
    }

    toast({
      title: editingRole ? "Role Updated" : "Role Created",
      description: `${form.label.trim()} saved successfully.`,
    });
    setIsFormOpen(false);
    setEditingRole(null);
    setForm(defaultForm);
    void loadRoles();
  };

  const deleteRole = async () => {
    if (!deletingRole) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    const targetRole = deletingRole;
    setIsDeleting(true);
    const { error } = await supabase.from("roles").delete().eq("id", targetRole.id);
    setIsDeleting(false);

    if (error) {
      toast({ title: "Delete Failed", description: error.message });
      return;
    }

    toast({ title: "Role Deleted", description: `${targetRole.label} was removed.` });
    if (editingRole?.id === targetRole.id) {
      setEditingRole(null);
      setForm(defaultForm);
      setIsFormOpen(false);
    }
    setDeletingRole(null);
    setIsDeleteDialogOpen(false);
    void loadRoles();
  };

  const columns = [
    {
      header: "Role Label",
      accessor: (r: Role) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              r.code === "admin"
                ? "bg-destructive/15 text-destructive"
                : r.code === "staff"
                  ? "bg-primary/10 text-primary"
                  : r.code === "sk"
                    ? "bg-info/15 text-info"
                    : "bg-accent/15 text-accent"
            }`}
          >
            {r.code === "admin" ? <ShieldAlert size={20} /> : r.code === "staff" ? <ShieldCheck size={20} /> : <Shield size={20} />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground">{r.label}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{r.code}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Description",
      accessor: "description" as const,
      className: "max-w-[300px]",
    },
    {
      header: "Created",
      accessor: (r: Role) => <span className="text-xs font-medium text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Roles and Permissions</h1>
          <p className="text-muted-foreground mt-1 font-medium">Define and manage access levels for administrative users.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover active:bg-primary-active transition-all"
        >
          <Plus size={20} />
          Create Role
        </button>
      </header>

      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        onRowClick={openDetailsModal}
        getRowAriaLabel={(item) => `Open details for role ${item.label}`}
      />

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Role Details</DialogTitle>
            <DialogDescription>Read-only record view.</DialogDescription>
          </DialogHeader>
          {viewingRole && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Role Code</p><p className="font-medium uppercase">{viewingRole.code}</p></div>
                <div><p className="text-muted-foreground">Label</p><p className="font-medium">{viewingRole.label || "N/A"}</p></div>
                <div className="md:col-span-2"><p className="text-muted-foreground">Description</p><p className="font-medium">{viewingRole.description || "N/A"}</p></div>
                <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(viewingRole.created_at).toLocaleString()}</p></div>
              </div>
              <DialogFooter className="sm:justify-between">
                <p className="text-xs text-muted-foreground">Read-only record view.</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                  <Button type="button" onClick={() => { setIsDetailsOpen(false); openEditModal(viewingRole); }}>Edit</Button>
                  <Button type="button" variant="destructive" onClick={() => { setIsDetailsOpen(false); openDeleteModal(viewingRole); }}>Delete</Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>Changes here are saved directly to Supabase.</DialogDescription>
          </DialogHeader>

          <form onSubmit={saveRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-code">Role Code</Label>
              <select
                id="role-code"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value as Role["code"] }))}
                disabled={Boolean(editingRole)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                {ROLE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-label">Label</Label>
              <Input
                id="role-label"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeletingRole(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRole
                ? `Are you sure you want to delete "${deletingRole.label}"? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRole}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

