import type { Metadata } from "next";
import { Suspense } from "react";
import { OronmaskGame } from "@/components/oronmask/OronmaskGame";

export const metadata: Metadata = {
  title: "Öronmask",
  description: "Känner du igen låten? Dagens svenska låtar – från en halv sekund och uppåt.",
};

export default function Page() {
  return (
    <Suspense>
      <OronmaskGame />
    </Suspense>
  );
}
