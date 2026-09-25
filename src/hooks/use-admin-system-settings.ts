import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  type AdminSystemSettingCategory,
  type AdminSystemSettingKey,
  type AdminSystemSettingRecord,
  type AdminSystemSettingsValues,
  ADMIN_SETTINGS_CHANGE_EVENT,
  ADMIN_SYSTEM_SETTING_DEFINITIONS,
  adminGetSystemSettingsFromSupabase,
  adminSaveSystemSettingsInSupabase,
  getDefaultSystemSettingsMap,
  readCachedSystemSettings,
  validateSystemSettingValue,
} from "@/lib/admin-system-settings";

export function useAdminSystemSettings() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AdminSystemSettingRecord[]>([]);
  const [persistedSettings, setPersistedSettings] = useState<AdminSystemSettingsValues>(() => readCachedSystemSettings());
  const [draftSettings, setDraftSettings] = useState<AdminSystemSettingsValues>(() => readCachedSystemSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const canViewSettings = useMemo(() => {
    if (user?.roleCode === "super_admin") return true;
    return Boolean(user?.permissionCodes?.includes("system_settings_view"));
  }, [user]);

  const canManageSettings = useMemo(() => {
    if (user?.roleCode === "super_admin") return true;
    return Boolean(user?.permissionCodes?.includes("system_settings_manage"));
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!canViewSettings) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await adminGetSystemSettingsFromSupabase();
      setRecords(fetched);
      const map: Record<string, unknown> = {};
      fetched.forEach((r) => {
        map[r.settingKey] = r.value;
      });
      const values = map as unknown as AdminSystemSettingsValues;
      setPersistedSettings(values);
      setDraftSettings(values);
      setValidationErrors({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load system settings. Please try again.";
      console.error("Unable to load admin system settings:", err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [canViewSettings]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Sync with cross-tab / window storage events
  useEffect(() => {
    const handleStorageChange = () => {
      const latest = readCachedSystemSettings();
      setPersistedSettings((prev) => ({ ...prev, ...latest }));
    };
    window.addEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleStorageChange);
    };
  }, []);

  const updateDraft = useCallback((key: AdminSystemSettingKey | string, value: unknown) => {
    setDraftSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    const check = validateSystemSettingValue(key, value);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (!check.valid && check.error) {
        next[key] = check.error;
      } else {
        delete next[key];
      }
      return next;
    });
  }, []);

  const dirtyKeys = useMemo(() => {
    const keys: string[] = [];
    for (const def of ADMIN_SYSTEM_SETTING_DEFINITIONS) {
      const persistedVal = persistedSettings[def.key];
      const draftVal = draftSettings[def.key];
      if (JSON.stringify(persistedVal) !== JSON.stringify(draftVal)) {
        keys.push(def.key);
      }
    }
    return keys;
  }, [persistedSettings, draftSettings]);

  const hasChanges = dirtyKeys.length > 0;

  const discardChanges = useCallback((category?: AdminSystemSettingCategory) => {
    if (!category) {
      setDraftSettings({ ...persistedSettings });
      setValidationErrors({});
      return;
    }
    const defsInCategory = ADMIN_SYSTEM_SETTING_DEFINITIONS.filter((d) => d.category === category);
    setDraftSettings((prev) => {
      const next = { ...prev };
      defsInCategory.forEach((d) => {
        next[d.key] = persistedSettings[d.key];
      });
      return next;
    });
    setValidationErrors((prev) => {
      const next = { ...prev };
      defsInCategory.forEach((d) => {
        delete next[d.key];
      });
      return next;
    });
  }, [persistedSettings]);

  const resetCategoryToDefaults = useCallback((category: AdminSystemSettingCategory) => {
    const defaults = getDefaultSystemSettingsMap();
    const defsInCategory = ADMIN_SYSTEM_SETTING_DEFINITIONS.filter((d) => d.category === category);
    setDraftSettings((prev) => {
      const next = { ...prev };
      defsInCategory.forEach((d) => {
        next[d.key] = defaults[d.key];
      });
      return next;
    });
    setValidationErrors((prev) => {
      const next = { ...prev };
      defsInCategory.forEach((d) => {
        delete next[d.key];
      });
      return next;
    });
  }, []);

  const saveChanges = useCallback(
    async (category?: AdminSystemSettingCategory): Promise<{ success: boolean; error?: string }> => {
      if (!canManageSettings) {
        return { success: false, error: "You do not have permission to modify system settings." };
      }

      const keysToSave = category
        ? dirtyKeys.filter((k) => {
          const def = ADMIN_SYSTEM_SETTING_DEFINITIONS.find((d) => d.key === k);
          return def?.category === category;
        })
        : dirtyKeys;

      if (keysToSave.length === 0) {
        return { success: true };
      }

      // Check validation errors before saving
      for (const k of keysToSave) {
        const val = draftSettings[k as AdminSystemSettingKey];
        const check = validateSystemSettingValue(k, val);
        if (!check.valid) {
          setValidationErrors((prev) => ({ ...prev, [k]: check.error || "Invalid value" }));
          return { success: false, error: `Validation error in ${k}: ${check.error}` };
        }
      }

      setIsSaving(true);
      setError(null);

      try {
        const updates = keysToSave.map((k) => ({
          key: k,
          value: draftSettings[k as AdminSystemSettingKey],
        }));

        const saved = await adminSaveSystemSettingsInSupabase(updates);

        setPersistedSettings((prev) => {
          const next = { ...prev };
          saved.forEach((r) => {
            (next as Record<string, unknown>)[r.settingKey] = r.value;
          });
          return next;
        });

        setRecords((prev) => {
          const map = new Map(prev.map((r) => [r.settingKey, r]));
          saved.forEach((r) => map.set(r.settingKey, r));
          return Array.from(map.values());
        });

        return { success: true };
      } catch (err: unknown) {
        console.error("Failed to save admin system settings:", err);
        const msg = err instanceof Error ? err.message : "Unable to save settings. Please try again.";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [canManageSettings, dirtyKeys, draftSettings],
  );

  return {
    records,
    settings: persistedSettings,
    draftSettings,
    dirtyKeys,
    hasChanges,
    validationErrors,
    isLoading,
    isSaving,
    error,
    canViewSettings,
    canManageSettings,
    updateDraft,
    saveChanges,
    discardChanges,
    resetCategoryToDefaults,
    refreshSettings: loadSettings,
  };
}
