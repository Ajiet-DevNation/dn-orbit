import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface TacticalTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  id?: string;
}

export function TacticalTable<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick,
  id = "TBL_STATIC"
}: TacticalTableProps<T>) {
  return (
    <div className="w-full font-mono text-white overflow-x-auto border-2 border-white/10 bg-[#0a0a0a]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-white/10 bg-[#22c55e]/[0.06]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="retro text-left py-4 px-6 text-[9px] uppercase tracking-widest text-[#22c55e]/80 border-r border-white/5 last:border-r-0"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="retro py-12 text-center text-[9px] uppercase tracking-[0.3em] text-zinc-700"
              >
                NO_RECORDS_FOUND_IN_{id}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick && onRowClick(item)}
                className={`group hover:bg-[#22c55e]/5 transition-colors ${onRowClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="py-4 px-6 text-xs font-bold border-r border-white/5 last:border-r-0 group-hover:border-[#22c55e]/20"
                  >
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Table Metadata Footer */}
      <div className="border-t-2 border-white/10 bg-[#22c55e]/[0.04] p-2 flex items-center justify-between">
        <span className="retro text-[7px] text-zinc-600 tracking-widest uppercase">
          {id} ADDR_0x{data.length.toString(16).padStart(4, '0').toUpperCase()}
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-[#22c55e]/40" />
          <div className="w-1 h-1 bg-[#22c55e]/40" />
          <div className="w-1 h-1 bg-[#22c55e]" />
        </div>
      </div>
    </div>
  );
}
