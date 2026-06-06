import { useEffect, useMemo, useState } from "react";
import { PREDEFINED_ADMIN_USER } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

type JoinedType = "organizations";

export type UserSettings = {
  fullName: string;
  email: string;
  contactNumber: string;
  municipality: string;
  barangay: string;
  bio: string;
  notifications: boolean;
  showEmailPublic: boolean;
};

type UserProfileState = {
  settings: UserSettings;
  joined: {
    organizations: string[];
  };
};

const defaultProfile: UserProfileState = {
  settings: {
    fullName: "",
    email: "",
    contactNumber: "",
    municipality: "Prototype Municipality",
    barangay: "",
    bio: "",
    notifications: true,
    showEmailPublic: false,
  },
  joined: {
    organizations: [],
  },
};

const getBarangayIdByName = async (barangayName: string) => {
  if (!supabase || !barangayName.trim()) return null;
  const { data } = await supabase.from("barangays").select("id").eq("name", barangayName.trim()).maybeSingle();
  return data?.id ?? null;
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileState>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const isLocalAdmin = user?.id === PREDEFINED_ADMIN_USER.id;

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (!mounted) return;
        setProfile(defaultProfile);
        setIsLoading(false);
        return;
      }

      if (!supabase || isLocalAdmin) {
        if (!mounted) return;
        setProfile({
          ...defaultProfile,
          settings: {
            ...defaultProfile.settings,
            fullName: user.displayName ?? "",
            email: user.email ?? "",
          },
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const [profileResp, joinedOrgsResp] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("full_name,display_name,email,contact_number,municipality,bio,notifications,show_email_public,barangay_id,barangays(name)")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("user_org_memberships").select("organization_id").eq("user_id", user.id).is("left_at", null),
      ]);

      const profileRow = profileResp.data;
      let resolvedBarangay =
        (Array.isArray(profileRow?.barangays) ? profileRow?.barangays[0] : profileRow?.barangays)?.name ?? "";

      if (!resolvedBarangay && profileRow?.barangay_id) {
        const { data: barangayData } = await supabase
          .from("barangays")
          .select("name")
          .eq("id", profileRow.barangay_id)
          .maybeSingle();
        resolvedBarangay = barangayData?.name ?? "";
      }

      const loaded: UserProfileState = {
        settings: {
          fullName: profileRow?.full_name ?? profileRow?.display_name ?? user.displayName ?? "",
          email: profileRow?.email ?? user.email ?? "",
          contactNumber: profileRow?.contact_number ?? "",
          municipality: profileRow?.municipality ?? "Prototype Municipality",
          barangay: resolvedBarangay,
          bio: profileRow?.bio ?? "",
          notifications: profileRow?.notifications ?? true,
          showEmailPublic: profileRow?.show_email_public ?? false,
        },
        joined: {
          organizations: (joinedOrgsResp.data ?? []).map((row) => row.organization_id),
        },
      };

      if (!mounted) return;
      setProfile(loaded);
      setIsLoading(false);
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [isLocalAdmin, user]);

  const persist = (next: UserProfileState) => {
    setProfile(next);
  };

  const updateSettings = (settings: UserSettings) => {
    const next = { ...profile, settings };
    persist(next);

    if (!supabase || !user || isLocalAdmin) return;

    void (async () => {
      const barangayId = await getBarangayIdByName(settings.barangay);
      await supabase.from("user_profiles").upsert({
        user_id: user.id,
        email: settings.email || user.email,
        full_name: settings.fullName,
        display_name: settings.fullName,
        contact_number: settings.contactNumber,
        municipality: settings.municipality,
        barangay_id: barangayId,
        bio: settings.bio,
        notifications: settings.notifications,
        show_email_public: settings.showEmailPublic,
      });
    })();
  };

  const join = (type: JoinedType, id: string) => {
    if (!supabase || !user || isLocalAdmin) return;
    if (profile.joined[type].includes(id)) return;

    const next = {
      ...profile,
      joined: { ...profile.joined, [type]: [...profile.joined[type], id] },
    };
    persist(next);

    void (async () => {
      if (type === "organizations") {
        await supabase.from("user_org_memberships").insert({ user_id: user.id, organization_id: id });
      }
    })();
  };

  const leave = (type: JoinedType, id: string) => {
    if (!supabase || !user || isLocalAdmin) return;

    const next = {
      ...profile,
      joined: {
        ...profile.joined,
        [type]: profile.joined[type].filter((itemId) => itemId !== id),
      },
    };
    persist(next);

    void (async () => {
      if (type === "organizations") {
        await supabase
          .from("user_org_memberships")
          .update({ left_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("organization_id", id)
          .is("left_at", null);
      }
    })();
  };

  const isJoined = (type: JoinedType, id: string) => profile.joined[type].includes(id);

  const joinedCounts = useMemo(
    () => ({
      organizations: profile.joined.organizations.length,
    }),
    [profile.joined.organizations.length],
  );

  return {
    profile,
    isLoading,
    updateSettings,
    join,
    leave,
    isJoined,
    joinedCounts,
  };
};
