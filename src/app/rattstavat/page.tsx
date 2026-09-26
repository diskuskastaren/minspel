import type { Metadata } from "next";
import { Suspense } from "react";
import { RattstavatGame } from "@/components/rattstavat/RattstavatGame";

export const metadata: Metadata = {
  title: "Rättstavat",
  description: "Hör ordet och stava det rätt – fem nya svenska ord varje dag.",
};

export default function Page() {
  return (
    <Suspense>
      <RattstavatGame />
    </Suspense>
  );
}
