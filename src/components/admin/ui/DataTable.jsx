import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found.',
  loading = false,
  actions = [],
  filters = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [filterValues, setFilterValues] = useState(() => {
    const initial = {};
    filters.forEach((f) => {
      initial[f.key] = '';
    });
    return initial;
  });

  // Handle column header click for sorting
  const handleSort = (columnKey) => {
    if (sortKey === columnKey) {
      // Toggle direction or reset
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  // Process data: filter → search → sort
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply dropdown filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== '') {
        result = result.filter((row) => {
          const rowValue = row[key];
          return String(rowValue) === String(value);
        });
      }
    });

    // Apply search across all column keys
    if (searchable && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const cellValue = row[col.key];
          if (cellValue == null) return false;
          return String(cellValue).toLowerCase().includes(term);
        })
      );
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];

        // Handle Firestore timestamps
        if (aVal?.toDate) aVal = aVal.toDate();
        if (bVal?.toDate) bVal = bVal.toDate();

        // Null handling
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Number comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Date comparison
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        const cmp = aStr.localeCompare(bStr);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, columns, searchTerm, searchable, sortKey, sortDirection, filterValues]);

  // Sort indicator
  const renderSortIcon = (columnKey) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="w-3 h-3 text-gray-600 ml-1 inline-block" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-3 h-3 text-white ml-1 inline-block" />;
    }
    return <ChevronDown className="w-3 h-3 text-white ml-1 inline-block" />;
  };

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
      {/* Toolbar: Search + Filters + Actions */}
      {(searchable || filters.length > 0 || actions.length > 0) && (
        <div className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between border-b border-white/5">
          {/* Left: Search + Filters */}
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            {/* Search Input */}
            {searchable && (
              <div className="relative w-full lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                />
              </div>
            )}

            {/* Filter Dropdowns */}
            {filters.map((filter) => (
              <select
                key={filter.key}
                value={filterValues[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
              >
                <option value="">{filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
          </div>

          {/* Right: Action Buttons */}
          {actions.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {actions.map((action, idx) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-4 py-2 flex items-center gap-2"
                  >
                    {ActionIcon && <ActionIcon className="w-4 h-4" />}
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Table Content */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
        </div>
      ) : processedData.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-4 ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-200 transition duration-150' : ''}`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => {
                      if (col.sortable !== false) {
                        handleSort(col.key);
                      }
                    }}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {col.sortable !== false && renderSortIcon(col.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {processedData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-white/[0.02] transition duration-150 group ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4"
                      style={col.width ? { width: col.width } : undefined}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] != null ? String(row[col.key]) : '—')
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
