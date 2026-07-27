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
  rowKey,
}: {
  data: T[];
  columns: PixelColumn<T>[];
  empty?: string;
  /**
   * Stable identity per row. Defaults to `row.id` when present, falling back to
   * the array index. Keying by index alone made React reuse the DOM of a
   * deleted row for its successor, so a pending `<Select>` or focused input
   * could carry over onto a different record after a refresh.
   */
  rowKey?: (row: T, index: number) => string | number;
}) {
  const keyOf =
    rowKey ??
    ((row: T, i: number) => {
      const id = (row as { id?: unknown }).id;
      return typeof id === "string" || typeof id === "number" ? id : i;
    });

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
            <tr
              key={keyOf(row, i)}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-xs text-white",
                    c.align === "right" && "text-right",
                  )}
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
