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
    <div className="w-full font-mono text-white overflow-x-auto border border-zinc-900 bg-black">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-900 bg-zinc-950">
            {columns.map((col) => (
              <th 
                key={col.key}
                className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-black text-zinc-500 border-r border-zinc-900 last:border-r-0"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="py-12 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-700 italic"
              >
                NO_RECORDS_FOUND_IN_{id}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick && onRowClick(item)}
                className={`group hover:bg-zinc-950 transition-colors cursor-pointer ${onRowClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {columns.map((col) => (
                  <td 
                    key={col.key}
                    className="py-4 px-6 text-xs font-bold border-r border-zinc-900 last:border-r-0 group-hover:border-white/10"
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
      <div className="border-t border-zinc-900 bg-zinc-950/50 p-2 flex items-center justify-between">
        <span className="text-[8px] text-zinc-700 tracking-widest uppercase">
          {id} {"//"} ADDR_0x{data.length.toString(16).padStart(4, '0').toUpperCase()}
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-zinc-800" />
          <div className="w-1 h-1 bg-zinc-800" />
          <div className="w-1 h-1 bg-zinc-600" />
        </div>
      </div>
    </div>
  );
}
