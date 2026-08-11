import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Filter, Mail, Phone, Search, User } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { UserProfile } from "../types";
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

type BarangayOption = {
  id: string;
  name: string;
};

type UserRow = UserProfile & {
  id: string;
  barangay_name: string;
  role_codes: string[];
};

type UserForm = {
  fullName: string;
  displayName: string;
  email: string;
  contactNumber: string;
  municipality: string;
  barangayId: string;
  bio: string;
  notifications: boolean;
  showEmailPublic: boolean;
};

const defaultForm: UserForm = {
  fullName: "",
  displayName: "",
  email: "",
  contactNumber: "",
  municipality: "",
  barangayId: "",
  bio: "",
  notifications: true,
  showEmailPublic: false,
};

export const UsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [barangays, setBarangays] = useState<BarangayOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [municipalityFilter, setMunicipalityFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<UserForm>(defaultForm);
  const { toast } = useToast();

  const loadUsers = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setUsers([]);
      setBarangays([]);
      setIsLoading(false);
      return;
    }

    const [profilesResp, rolesResp, barangaysResp] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("*,barangays(name)")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,roles(code)"),
      supabase.from("barangays").select("id,name").order("name", { ascending: true }),
    ]);

    if (profilesResp.error) {
      toast({ title: "Load Failed", description: profilesResp.error.message });
      setUsers([]);
      setBarangays([]);
      setIsLoading(false);
      return;
    }

    const rolesByUser = (rolesResp.data ?? []).reduce<Record<string, string[]>>((acc, row) => {
      const relation = (row as { roles?: { code?: string } | Array<{ code?: string }> }).roles;
      const code = Array.isArray(relation) ? relation[0]?.code : relation?.code;
      if (!code) return acc;
      if (!acc[row.user_id]) acc[row.user_id] = [];
      acc[row.user_id].push(code);
      return acc;
    }, {});

    const mapped: UserRow[] = ((profilesResp.data ?? []) as Array<UserProfile & { barangays?: { name?: string } | Array<{ name?: string }> }>)
      .map((profile) => {
        const barangayRef = Array.isArray(profile.barangays) ? profile.barangays[0] : profile.barangays;
        return {
          ...profile,
          id: profile.user_id,
          barangay_name: barangayRef?.name ?? "",
          role_codes: rolesByUser[profile.user_id] ?? [],
        };
      });

    setUsers(mapped);
    setBarangays((barangaysResp.data ?? []) as BarangayOption[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openUserDetails = (user: UserRow) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const openEditModal = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      fullName: user.full_name ?? "",
      displayName: user.display_name ?? "",
      email: user.email ?? "",
      contactNumber: user.contact_number ?? "",
      municipality: user.municipality ?? "",
      barangayId: user.barangay_id ?? "",
      bio: user.bio ?? "",
      notifications: user.notifications ?? true,
      showEmailPublic: user.show_email_public ?? false,
    });
    setIsFormOpen(true);
  };

  const openDeleteModal = (user: UserRow) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    if (!form.email.trim()) {
      toast({ title: "Missing Email", description: "Email is required." });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({
        full_name: form.fullName.trim() || null,
        display_name: form.displayName.trim() || null,
        email: form.email.trim(),
        contact_number: form.contactNumber.trim() || null,
        municipality: form.municipality.trim() || "Prototype Municipality",
        barangay_id: form.barangayId || null,
        bio: form.bio.trim() || null,
        notifications: form.notifications,
        show_email_public: form.showEmailPublic,
      })
      .eq("user_id", editingUser.user_id);
    setIsSaving(false);

    if (error) {
      toast({ title: "Save Failed", description: error.message });
      return;
    }

    toast({ title: "User Updated", description: `${form.email.trim()} updated successfully.` });
    setIsFormOpen(false);
    setEditingUser(null);
    setForm(defaultForm);
    void loadUsers();
  };

  const deleteUser = async () => {
    if (!deletingUser) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    const targetUser = deletingUser;
    setIsDeleting(true);
    const profileResult = await supabase.from("user_profiles").delete().eq("user_id", targetUser.user_id);
    setIsDeleting(false);

    if (profileResult.error) {
      toast({ title: "Delete Failed", description: profileResult.error.message });
      return;
    }

    toast({
      title: "User Deleted",
      description: `${targetUser.email} was removed from user profiles. If SQL migration 16 is installed, auth.users is removed too.`,
    });

    if (selectedUser?.user_id === targetUser.user_id) {
      setSelectedUser(null);
      setIsDetailsOpen(false);
    }

    if (editingUser?.user_id === targetUser.user_id) {
      setEditingUser(null);
      setForm(defaultForm);
      setIsFormOpen(false);
    }

    setDeletingUser(null);
    setIsDeleteDialogOpen(false);
    void loadUsers();
  };

  const columns: {
    header: string;
    accessor: keyof UserRow | ((u: UserRow) => React.ReactNode);
    className?: string;
  }[] = [
    {
      header: "User",
      accessor: (u: UserRow) => (
        <button type="button" onClick={() => openUserDetails(u)} className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground overflow-hidden">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground underline-offset-2 hover:underline">{u.full_name || "Anonymous"}</span>
            <span className="text-xs text-muted-foreground font-medium">{u.display_name || "@user"}</span>
          </div>
        </button>
      ),
    },
    {
      header: "Contact Info",
      accessor: (u: UserRow) => (
        <button
          type="button"
          onClick={() => openUserDetails(u)}
          className="flex flex-col text-left text-xs font-medium text-muted-foreground gap-1 hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-1">
            <Mail size={12} className="text-muted-foreground" />
            <span>{u.email}</span>
          </div>
          {u.contact_number && (
            <div className="flex items-center gap-1">
              <Phone size={12} className="text-muted-foreground" />
              <span>{u.contact_number}</span>
            </div>
          )}
        </button>
      ),
    },
    {
      header: "Roles",
      accessor: (u: UserRow) => <span className="text-xs font-medium text-muted-foreground">{u.role_codes.join(", ") || "youth"}</span>,
    },
    {
      header: "Location",
      accessor: (u: UserRow) => (
        <span className="text-xs font-medium text-muted-foreground">
          {u.barangay_name ? `${u.barangay_name}, ` : ""}
          {u.municipality}
        </span>
      ),
    },
    {
      header: "Joined",
      accessor: (u: UserRow) => (
        <span className="text-xs font-medium text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
      ),
    },
  ];

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const term = searchTerm.trim().toLowerCase();
        const roles = u.role_codes.length > 0 ? u.role_codes : ["youth"];
        const matchesSearch =
          term.length === 0
            ? true
            : (u.full_name?.toLowerCase() || "").includes(term) ||
              (u.display_name?.toLowerCase() || "").includes(term) ||
              u.email.toLowerCase().includes(term) ||
              (u.barangay_name?.toLowerCase() || "").includes(term) ||
              (u.municipality?.toLowerCase() || "").includes(term) ||
              roles.join(", ").toLowerCase().includes(term);
        const matchesRole = roleFilter === "all" ? true : roles.includes(roleFilter);
        const matchesBarangay = barangayFilter === "all" ? true : u.barangay_id === barangayFilter;
        const matchesMunicipality =
          municipalityFilter === "all" ? true : (u.municipality || "").toLowerCase() === municipalityFilter;
        return matchesSearch && matchesRole && matchesBarangay && matchesMunicipality;
      }),
    [searchTerm, users, roleFilter, barangayFilter, municipalityFilter],
  );

  const roleOptions = useMemo(
    () =>
      ["all", ...Array.from(new Set(users.flatMap((u) => (u.role_codes.length > 0 ? u.role_codes : ["youth"])))).sort((a, b) => a.localeCompare(b))],
    [users],
  );

  const municipalityOptions = useMemo(
    () =>
      ["all", ...Array.from(new Set(users.map((u) => (u.municipality || "").trim().toLowerCase()).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [users],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1 font-medium">View and manage youth profiles and account information.</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-card p-4 rounded-2xl border border-border card-shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search users by name, email, or barangay..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className={`flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-xl transition-all border ${
            showFilters
              ? "text-primary bg-primary/10 border-primary/30"
              : "text-muted-foreground hover:bg-muted border-border"
          }`}
        >
          <Filter size={18} />
          Filter
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-card p-4 rounded-2xl border border-border card-shadow">
          <div className="space-y-1">
            <Label>Role</Label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role === "all" ? "All Roles" : role}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Barangay</Label>
            <select
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Barangays</option>
              {barangays.map((barangay) => (
                <option key={barangay.id} value={barangay.id}>
                  {barangay.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Municipality</Label>
            <select
              value={municipalityFilter}
              onChange={(e) => setMunicipalityFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {municipalityOptions.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality === "all"
                    ? "All Municipalities"
                    : municipality
                        .split(" ")
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(" ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRoleFilter("all");
                setBarangayFilter("all");
                setMunicipalityFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        onRowClick={openUserDetails}
        getRowAriaLabel={(item) => `Open details for ${item.email}`}
      />

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Review account information before editing or deleting.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedUser.full_name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Display Name</p>
                  <p className="font-medium">{selectedUser.display_name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Contact Number</p>
                  <p className="font-medium">{selectedUser.contact_number || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Barangay</p>
                  <p className="font-medium">{selectedUser.barangay_name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Municipality</p>
                  <p className="font-medium">{selectedUser.municipality || "N/A"}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-muted-foreground">Roles</p>
                  <p className="font-medium">{selectedUser.role_codes.join(", ") || "youth"}</p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    openEditModal(selectedUser);
                  }}
                >
                  Edit User
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    openDeleteModal(selectedUser);
                  }}
                >
                  Delete User
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Update user profile fields stored in Supabase.</DialogDescription>
          </DialogHeader>

          <form onSubmit={saveUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-full-name">Full Name</Label>
                <Input
                  id="user-full-name"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-display-name">Display Name</Label>
                <Input
                  id="user-display-name"
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-contact">Contact Number</Label>
                <Input
                  id="user-contact"
                  value={form.contactNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-municipality">Municipality</Label>
                <Input
                  id="user-municipality"
                  value={form.municipality}
                  onChange={(e) => setForm((prev) => ({ ...prev, municipality: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-barangay">Barangay</Label>
                <select
                  id="user-barangay"
                  value={form.barangayId}
                  onChange={(e) => setForm((prev) => ({ ...prev, barangayId: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">None</option>
                  {barangays.map((barangay) => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="user-bio">Bio</Label>
                <Textarea
                  id="user-bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.notifications}
                  onChange={(e) => setForm((prev) => ({ ...prev, notifications: e.target.checked }))}
                  className="h-4 w-4"
                />
                Notifications enabled
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.showEmailPublic}
                  onChange={(e) => setForm((prev) => ({ ...prev, showEmailPublic: e.target.checked }))}
                  className="h-4 w-4"
                />
                Show email publicly
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
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
            setDeletingUser(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser
                ? `Are you sure you want to delete ${deletingUser.email}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
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

