import { type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  exportable?: boolean;
  onExport?: (type?: "csv" | "pdf" | "xlsx") => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
  actions?: ReactNode;
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
}

export function DataTable<T>({
  title,
  columns,
  data,
  isLoading,
  searchable,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  exportable,
  onExport,
  pagination,
  emptyMessage = "No data found",
  actions,
  onRowClick,
  getRowKey,
}: DataTableProps<T>) {
  const getValue = (item: T, key: keyof T | string): unknown => {
    if (typeof key === "string" && key.includes(".")) {
      return key.split(".").reduce((obj: any, k) => obj?.[k], item);
    }
    return item[key as keyof T];
  };

  return (
    <Card>
      {(title || searchable || exportable || actions) && (
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {searchable && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            )}
            {actions}
            {exportable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-export">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onExport?.("csv")}>Export CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onExport?.("pdf")}>Export PDF</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onExport?.("xlsx")}>Export Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={cn("text-xs font-semibold uppercase tracking-wider", column.className)}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={String(column.key)}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow
                    key={getRowKey(item)}
                    className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                    onClick={() => onRowClick?.(item)}
                    data-testid={`row-${getRowKey(item)}`}
                  >
                    {columns.map((column) => (
                      <TableCell key={String(column.key)} className={column.className}>
                        {column.render
                          ? column.render(item)
                          : String(getValue(item, column.key) ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.currentPage - 1) * 10 + 1} to{" "}
              {Math.min(pagination.currentPage * 10, pagination.totalItems)} of{" "}
              {pagination.totalItems} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
