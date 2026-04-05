import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
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
  id: initialId
}: TacticalTableProps<T>) {
  const [id, setId] = React.useState(initialId || "TBL_----");

  React.useEffect(() => {
    if (!initialId) {
      setId("TBL_" + Math.random().toString(16).slice(2, 6).toUpperCase());
    }
  }, [initialId]);
  return (
    <div className="w-full font-mono text-white overflow-x-auto border border-zinc-900 bg-black">
      <table className="w-full border-collapse">
        <thead className="bg-zinc-950/50 border-b border-zinc-800">
          <tr>
            {columns.map((col, i) => (
              <th 
                key={i} 
                className={`px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ${col.className}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-xs text-zinc-700 uppercase tracking-widest italic">
                 NO_DATA_FOUND_IN_SECTOR_"{id}"
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={`group hover:bg-white/[0.03] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors ${col.className}`}
                  >
                    {typeof col.accessor === 'function' 
                      ? col.accessor(item) 
                      : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {/* Table Footer Meta */}
      <div className="px-6 py-3 bg-zinc-950/30 flex items-center justify-between border-t border-zinc-900">
         <span className="text-[8px] text-zinc-700 font-black tracking-[0.5em] uppercase">TABLE_ID: {id}</span>
         <span className="text-[8px] text-zinc-700 font-black tracking-[0.5em] uppercase">ENTRIES: {data.length}</span>
      </div>
    </div>
  );
}
