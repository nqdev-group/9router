"use client";

import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components";
import TokenSaverReport from "./TokenSaverReport";

export default function TokenSaverPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <TokenSaverReport />
    </Suspense>
  );
}
