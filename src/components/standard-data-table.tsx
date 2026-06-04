"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<TItem, TSort extends string> {
  key: string;
  header: string;
  sortKey?: TSort;
  className?: string;
  render: (item: TItem) => ReactNode;
}

export interface DataTableFilterOption {
  label: string;
  value: string;
}

export interface DataTableFilter {
  key: string;
  label: string;
  value: string;
  options: DataTableFilterOption[];
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface StandardDataTableProps<TItem, TSort extends string> {
  title: string;
  description: string;
  searchValue: string;
  searchPlaceholder: string;
  sort: TSort;
  direction: SortDirection;
  filters: DataTableFilter[];
  columns: DataTableColumn<TItem, TSort>[];
  rows: TItem[];
  getRowKey: (item: TItem) => string;
  pagination: DataTablePagination;
  emptyState: ReactNode;
}

function getNextDirection(isCurrentSort: boolean, direction: SortDirection): SortDirection {
  if (!isCurrentSort) {
    return "asc";
  }

  return direction === "asc" ? "desc" : "asc";
}

export function StandardDataTable<TItem, TSort extends string>({
  title,
  description,
  searchValue,
  searchPlaceholder,
  sort,
  direction,
  filters,
  columns,
  rows,
  getRowKey,
  pagination,
  emptyState,
}: StandardDataTableProps<TItem, TSort>): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(formData: FormData): void {
    const query = formData.get("q");
    updateParams({
      q: typeof query === "string" ? query.trim() : null,
      page: "1",
    });
  }

  function clearFilters(): void {
    const updates: Record<string, string | null> = {
      q: null,
      page: "1",
    };

    filters.forEach((filter) => {
      updates[filter.key] = null;
    });

    updateParams(updates);
  }

  const startItem = pagination.totalItems === 0
    ? 0
    : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <form action={handleSearch} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="table-search">Search</label>
            <input
              id="table-search"
              name="q"
              defaultValue={searchValue}
              placeholder={searchPlaceholder}
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Search
            </button>
          </form>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {filters.map((filter) => (
              <label key={filter.key} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                {filter.label}
                <select
                  value={filter.value}
                  onChange={(event) => updateParams({ [filter.key]: event.target.value || null, page: "1" })}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 self-end rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        emptyState
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => {
                  const isSorted = column.sortKey === sort;
                  return (
                    <th key={column.key} className={`border-b border-slate-200 px-5 py-3 font-semibold ${column.className ?? ""}`}>
                      {column.sortKey ? (
                        <button
                          type="button"
                          onClick={() => updateParams({
                            sort: column.sortKey ?? null,
                            direction: getNextDirection(isSorted, direction),
                            page: "1",
                          })}
                          className="inline-flex items-center gap-1 rounded-sm text-left transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        >
                          {column.header}
                          <span aria-hidden>{isSorted ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      ) : column.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={getRowKey(row)} className="transition hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-5 py-4 align-top ${column.className ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>
          Showing {startItem}-{endItem} of {pagination.totalItems} records
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => updateParams({ page: String(pagination.page - 1) })}
            className="h-9 rounded-md border border-slate-300 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-2 font-medium text-slate-700">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateParams({ page: String(pagination.page + 1) })}
            className="h-9 rounded-md border border-slate-300 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
