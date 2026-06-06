import { Building2, Camera, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { UserSettings, useUserProfile } from "@/hooks/use-user-profile";
import type { YouthOrganization } from "@/lib/youthCatalog";
import { fetchOrganizations } from "@/lib/data-api";
import { useToast } from "@/hooks/use-toast";

const initialsFrom = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "LY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const roleTagLabel = (role: string) => {
  if (role === "sk") return "Barangay SK";
  if (role === "staff") return "LYDO Staff";
  if (role === "admin") return "Admin";
  if (role === "youth") return "Youth";
  return "User";
};

export default function Profile() {
  const { isAuthenticated, user, isInitialized, role } = useAuth();
  const { profile, updateSettings } = useUserProfile();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<{
    organizations: YouthOrganization[];
  }>({
    organizations: [],
  });
  const [settings, setSettings] = useState<UserSettings>(profile.settings);

  useEffect(() => {
    setSettings(profile.settings);
  }, [profile.settings]);

  useEffect(() => {
    let mounted = true;
    const loadCatalog = async () => {
      const organizations = await fetchOrganizations();
      if (!mounted) return;
      setCatalog({ organizations });
    };
    void loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container">
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings(settings);
    toast({
      title: "Settings Saved",
      description: "Your profile settings were updated successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="container py-8 space-y-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organization Profiles</p>
                  <p className="text-3xl leading-none font-semibold mt-1">{catalog.organizations.length}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-card border rounded-xl card-shadow overflow-hidden">
            <div className="px-6 py-5 border-b flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">Account Settings</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary/10 grid place-items-center text-primary text-3xl font-bold">
                    {initialsFrom(settings.fullName || user?.displayName || "LYDO")}
                  </div>
                  <button type="button" className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xl font-semibold">{settings.fullName || user?.displayName || "LYDO User"}</p>
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold">
                      {roleTagLabel(role)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{settings.email || user?.email || "user@lydo.local"}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={settings.fullName || "Not set"} readOnly />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="contactNumber">Phone Number</Label>
                  <Input id="contactNumber" value={settings.contactNumber} onChange={(e) => setSettings({ ...settings, contactNumber: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="municipality">Municipality</Label>
                  <Input id="municipality" value={settings.municipality || "Prototype Municipality"} readOnly />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Input id="barangay" value={settings.barangay || "Not set"} readOnly />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="min-w-36">
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          </form>

          <div className="grid lg:grid-cols-1 gap-4">
            <div className="bg-card border rounded-xl p-6 card-shadow">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Organizations</h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Browse organization information records for prototype demonstration.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/organizations">View Organization Info</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
