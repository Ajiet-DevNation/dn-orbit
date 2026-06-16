import { cn } from "@/lib/utils";

export interface PixelColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

export function PixelDataTable<T>({
  data,
  columns,
  empty = "NO RECORDS",
}: {
  data: T[];
  columns: PixelColumn<T>[];
  empty?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="retro border-2 border-white/10 px-5 py-10 text-center text-[9px] text-zinc-600">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border-2 border-white/10">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-white/10">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "retro px-4 py-3 text-[8px] tracking-widest text-zinc-500",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn("px-4 py-3 text-xs text-white", c.align === "right" && "text-right")}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
