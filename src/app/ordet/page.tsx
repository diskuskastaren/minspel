import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdetGame } from "@/components/ordet/OrdetGame";

export const metadata: Metadata = {
  title: "Ordet",
  description: "Gissa dagens ord på svenska – tre till åtta bokstäver, sex försök.",
};

export default function Page() {
  return (
    <Suspense>
      <OrdetGame />
    </Suspense>
  );
}
