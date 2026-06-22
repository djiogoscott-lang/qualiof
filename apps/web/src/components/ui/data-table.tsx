import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
  // Si true, la cellule de cette colonne n'est PAS wrappée dans le <a>
  // de rowHref. Utile pour les colonnes "actions" qui contiennent des
  // boutons cliquables qu'on ne veut pas faire naviguer.
  noLink?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty?: ReactNode;
}

export function DataTable<T>({ rows, columns, rowKey, rowHref, empty }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="glass-panel p-16 text-center text-sm text-zinc-400">
        {empty ?? 'Aucun résultat.'}
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden transition-shadow duration-300 hover:shadow-card-hover">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-400',
                    col.className,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    'border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors duration-200',
                    href && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3.5 text-zinc-200', col.className)}>
                      {href && !col.noLink ? (
                        <a href={href} className="block">
                          {col.cell(row)}
                        </a>
                      ) : (
                        col.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
