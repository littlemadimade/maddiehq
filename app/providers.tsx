"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { CreatorProvider } from "@/components/creator-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CreatorProvider>{children}</CreatorProvider>
    </SessionProvider>
  );
}
