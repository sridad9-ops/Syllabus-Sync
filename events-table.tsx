"use client";

import { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EVENT_TYPES, ExtractedEvent } from "@/lib/types";

interface EventsTableProps {
  events: ExtractedEvent[];
  onChange: (events: ExtractedEvent[]) => void;
}

export function EventsTable({ events, onChange }: EventsTableProps) {
  function updateEvent(id: string, patch: Partial<ExtractedEvent>) {
    onChange(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEvent(id: string) {
    onChange(events.filter((e) => e.id !== id));
  }

  function toggleAll(checked: boolean) {
    onChange(events.map((e) => ({ ...e, selected: checked })));
  }

  const allSelected = events.length > 0 && events.every((e) => e.selected);
  const someSelected = events.some((e) => e.selected) && !allSelected;

  const columns = useMemo<ColumnDef<ExtractedEvent>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(v) => toggleAll(Boolean(v))}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.selected}
            onCheckedChange={(v) => updateEvent(row.original.id, { selected: Boolean(v) })}
            aria-label="Select row"
          />
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Input
            value={row.original.title}
            onChange={(e) => updateEvent(row.original.id, { title: e.target.value })}
            className="h-8 min-w-[180px]"
          />
        ),
      },
      {
        accessorKey: "event_type",
        header: "Type",
        cell: ({ row }) => (
          <Select
            value={row.original.event_type}
            onValueChange={(v) => updateEvent(row.original.id, { event_type: v as ExtractedEvent["event_type"] })}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "due_date",
        header: "Due Date",
        cell: ({ row }) => (
          <Input
            type="date"
            value={row.original.due_date}
            onChange={(e) => updateEvent(row.original.id, { due_date: e.target.value })}
            className="h-8 w-[150px]"
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <Input
            value={row.original.description || ""}
            onChange={(e) => updateEvent(row.original.id, { description: e.target.value })}
            className="h-8 min-w-[220px]"
            placeholder="—"
          />
        ),
      },
      {
        accessorKey: "weight_percentage",
        header: "Weight %",
        cell: ({ row }) => (
          <Input
            type="number"
            value={row.original.weight_percentage ?? ""}
            onChange={(e) =>
              updateEvent(row.original.id, {
                weight_percentage: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="h-8 w-[90px]"
            placeholder="—"
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => removeEvent(row.original.id)} aria-label="Delete row">
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, allSelected, someSelected]
  );

  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.original.selected ? "selected" : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No events yet. Add one manually below.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
