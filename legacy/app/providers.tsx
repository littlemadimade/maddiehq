"use client";

import type { ReactNode } from "react";
import { CreatorProvider } from "@/components/creator-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <CreatorProvider>{children}</CreatorProvider>;
}
