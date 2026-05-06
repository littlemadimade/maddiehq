"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { defaultCreatorProfile, type CreatorProfile } from "@/lib/creator";

type CreatorContextValue = {
  profiles: CreatorProfile[];
  activeProfile: CreatorProfile;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  updateActiveProfile: (updates: Partial<CreatorProfile>) => void;
  addProfile: (name: string) => void;
};

const STORAGE_KEY = "maddiehq:creator-state";
const CreatorContext = createContext<CreatorContextValue | null>(null);

export function CreatorProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<CreatorProfile[]>([defaultCreatorProfile]);
  const [activeProfileId, setActiveProfileId] = useState(defaultCreatorProfile.id);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        profiles?: CreatorProfile[];
        activeProfileId?: string;
      };

      if (parsed.profiles?.length) {
        setProfiles(parsed.profiles);
      }

      if (parsed.activeProfileId) {
        setActiveProfileId(parsed.activeProfileId);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeProfileId }));
  }, [profiles, activeProfileId]);

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? defaultCreatorProfile;

  const value = useMemo<CreatorContextValue>(
    () => ({
      profiles,
      activeProfile,
      activeProfileId: activeProfile.id,
      setActiveProfileId,
      updateActiveProfile: (updates) => {
        setProfiles((current) =>
          current.map((profile) =>
            profile.id === activeProfile.id ? { ...profile, ...updates } : profile
          )
        );
      },
      addProfile: (name) => {
        const trimmed = name.trim();

        if (!trimmed) {
          return;
        }

        const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
        const profile: CreatorProfile = {
          id,
          name: trimmed,
          instagramHandle: `@${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
          accountType: "Creator",
          facebookPageLinked: false,
          insightsPermissionReady: false,
          status: "Setup needed"
        };

        setProfiles((current) => [...current, profile]);
        setActiveProfileId(id);
      }
    }),
    [activeProfile, profiles]
  );

  return <CreatorContext.Provider value={value}>{children}</CreatorContext.Provider>;
}

export function useCreator() {
  const value = useContext(CreatorContext);

  if (!value) {
    throw new Error("useCreator must be used within a CreatorProvider");
  }

  return value;
}
