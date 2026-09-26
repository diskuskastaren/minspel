"use client";
import u from "@/components/ui/ui.module.css";

const LONG_DATE = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function formatLongDate(date: string) {
  return LONG_DATE.format(new Date(`${date}T12:00:00Z`));
}

/** "#26 · lördag 26 september", med märkning för arkiv och förhandsvisning. */
export function DateLine({ data }: { data: { number: number; date: string; today: string } | null }) {
  if (!data) return " ";
  return (
    <>
      <span className="mono">#{data.number}</span> · {formatLongDate(data.date)}
      {data.date < data.today && <span className={u.archiveTag}>arkiv</span>}
      {data.date > data.today && <span className={u.archiveTag}>förhandsvisning</span>}
    </>
  );
}
