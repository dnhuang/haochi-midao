import { Fragment, useRef, useState } from "react";
import type { OrderItem } from "../types";
import { useDragSelect } from "../hooks/useDragSelect";
import GroupBar from "./GroupBar";

interface OrderTableProps {
  orders: OrderItem[];
  selected: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  /** Optional action element rendered at the right end of the toolbar */
  toolbarAction?: React.ReactNode;
  /** Callback to edit a row's label; if provided, label column is editable */
  onLabelChange?: (index: number, newLabel: string) => void;
  /** Group-related props */
  groupColors?: Record<string, string>;
  onGroupChange?: (index: number, group: string) => void;
  onAddGroup?: (name: string) => void;
  onDeleteGroup?: (name: string) => void;
  onSelectGroup?: (name: string) => void;
  onReorder?: (reorderedOrders: OrderItem[]) => void;
  /** Whether the Label column is visible */
  showLabel?: boolean;
  /** Callback to toggle label visibility */
  onToggleLabel?: () => void;
  /** Hide Address and Zip columns for compact layout */
  compact?: boolean;
  /** Map from full item_zh names to short display names */
  foodColumnLabels?: Record<string, string>;
}

/** Sort orders by group: ungrouped first, then alphabetical by group name */
function sortByGroup(orders: OrderItem[]): OrderItem[] {
  const ungrouped = orders.filter((o) => !o.group);
  const grouped = orders.filter((o) => !!o.group);
  const groupNames = [...new Set(grouped.map((o) => o.group!))].sort();
  const sorted: OrderItem[] = [...ungrouped];
  for (const name of groupNames) {
    sorted.push(...grouped.filter((o) => o.group === name));
  }
  return sorted;
}

/** Identify group boundaries for rendering dividers */
function getGroupBoundaries(orders: OrderItem[]): Map<number, string> {
  const boundaries = new Map<number, string>();
  let currentGroup: string | undefined;
  for (let i = 0; i < orders.length; i++) {
    const group = orders[i].group;
    if (group && group !== currentGroup) {
      boundaries.set(i, group);
    }
    currentGroup = group;
  }
  return boundaries;
}

export default function OrderTable({
  orders,
  selected,
  onSelectionChange,
  toolbarAction,
  onLabelChange,
  groupColors,
  onGroupChange,
  onAddGroup,
  onDeleteGroup,
  onSelectGroup,
  onReorder,
  showLabel,
  onToggleLabel,
  compact,
  foodColumnLabels,
}: OrderTableProps) {
  const hasGroups = groupColors && Object.keys(groupColors).length > 0;
  const sortedOrders = hasGroups ? sortByGroup(orders) : orders;
  const groupBoundaries = hasGroups ? getGroupBoundaries(sortedOrders) : new Map<number, string>();

  const orderIndices = sortedOrders.map((o) => o.index);
  const { handlers, selectAll, clearAll } = useDragSelect(orderIndices, selected, onSelectionChange);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const toggleExpand = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleDragStart = (orderIndex: number) => {
    dragIndexRef.current = orderIndex;
  };

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDropTarget(position);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    if (!onReorder || dragIndexRef.current === null) return;

    const draggedIndex = dragIndexRef.current;
    const draggedOrder = sortedOrders.find((o) => o.index === draggedIndex);
    const targetOrder = sortedOrders[targetPosition];
    if (!draggedOrder || !targetOrder) return;

    // Only allow reorder within the same group
    if (draggedOrder.group !== targetOrder.group) {
      handleDragEnd();
      return;
    }

    // Build the reordered array from the original orders
    const newOrders = [...orders];
    const fromIdx = newOrders.findIndex((o) => o.index === draggedIndex);
    const [moved] = newOrders.splice(fromIdx, 1);
    // Find where to insert: after the target in the original array
    const toIdx = newOrders.findIndex((o) => o.index === targetOrder.index);
    newOrders.splice(toIdx, 0, moved);
    onReorder(newOrders);
    handleDragEnd();
  };

  const groupNames = groupColors ? Object.keys(groupColors) : [];
  const labelVisible = showLabel !== false;
  const baseColCount = compact ? 5 : 7;
  const colCount = baseColCount + (onReorder ? 1 : 0) + (groupColors ? 1 : 0) + (labelVisible ? 1 : 0);

  return (
    <div>
      {/* GroupBar */}
      {groupColors && Object.keys(groupColors).length > 0 && (
        <GroupBar
          groupColors={groupColors}
          orders={orders}
          onAddGroup={onAddGroup || (() => {})}
          onDeleteGroup={onDeleteGroup || (() => {})}
          onSelectGroup={onSelectGroup}
          readOnly={!onAddGroup}
        />
      )}

      <div className="flex items-center gap-3 mb-3">
        <button onClick={selectAll} className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-0.5 hover:bg-rose-600 hover:text-white hover:border-rose-600">
          Select All
        </button>
        <button onClick={clearAll} className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-0.5 hover:bg-rose-600 hover:text-white hover:border-rose-600">
          Clear All
        </button>
        <span className="text-sm text-gray-500">
          {selected.size} of {orders.length} selected
        </span>
        {toolbarAction && <div className="ml-auto">{toolbarAction}</div>}
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-rose-50 text-left text-gray-600">
            <tr>
              {onReorder && <th className="w-8 px-1 py-2"></th>}
              <th className="w-8 px-2 py-2"></th>
              {labelVisible && (
                <th className="px-4 py-2">
                  <span className="inline-flex items-center gap-1">
                    Label
                    {onToggleLabel && (
                      <button
                        onClick={onToggleLabel}
                        className="text-gray-400 hover:text-gray-600"
                        title="Hide label column"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    )}
                  </span>
                </th>
              )}
              {!labelVisible && onToggleLabel && (
                <th className="w-8 px-1 py-2">
                  <button
                    onClick={onToggleLabel}
                    className="text-gray-400 hover:text-gray-600"
                    title="Show label column"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </th>
              )}
              {groupColors && <th className="px-4 py-2">Group</th>}
              <th className="px-4 py-2">Customer</th>
              {!compact && <th className="px-4 py-2">Address</th>}
              <th className="px-4 py-2">City</th>
              {!compact && <th className="px-4 py-2">Zip</th>}
              <th className="px-4 py-2">Items</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order, position) => {
              const isExpanded = expanded.has(order.index);
              const itemEntries = Object.entries(order.item_quantities);
              const groupColor = order.group && groupColors?.[order.group];
              const boundary = groupBoundaries.get(position);

              return (
                <Fragment key={order.index}>
                  {/* Group divider row */}
                  {boundary && (
                    <tr>
                      <td colSpan={colCount} className="px-0 py-0">
                        <div
                          className="flex items-center gap-2 px-4 py-1 text-xs font-medium text-gray-500 bg-gray-50"
                          style={{ borderLeft: `3px solid ${groupColors?.[boundary] || "#ccc"}` }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: groupColors?.[boundary] || "#ccc" }}
                          />
                          {boundary}
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr
                    onMouseDown={(e) => handlers.onMouseDown(order.index, e)}
                    onMouseEnter={() => handlers.onMouseEnter(order.index)}
                    onDragOver={(e) => handleDragOver(e, position)}
                    onDrop={(e) => handleDrop(e, position)}
                    className={`border-t border-gray-100 cursor-pointer select-none ${
                      selected.has(order.index) ? "bg-rose-200" : "hover:bg-gray-50"
                    } ${dropTarget === position ? "border-t-2 border-t-rose-400" : ""}`}
                    style={groupColor ? { borderLeft: `3px solid ${groupColor}` } : undefined}
                  >
                    {/* Drag handle */}
                    {onReorder && (
                      <td className="px-1 py-2 text-center">
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(order.index);
                          }}
                          onDragEnd={handleDragEnd}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="cursor-grab text-gray-300 hover:text-gray-500 select-none"
                        >
                          ⠿
                        </span>
                      </td>
                    )}
                    {/* Expand button */}
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={(e) => toggleExpand(order.index, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center"
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </td>
                    {/* Label */}
                    {labelVisible && (
                      <td className="px-4 py-2 text-gray-500">
                        {onLabelChange ? (
                          <input
                            type="text"
                            value={order.delivery}
                            onChange={(e) => onLabelChange(order.index, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-rose-400 focus:outline-none w-20"
                          />
                        ) : (
                          order.delivery
                        )}
                      </td>
                    )}
                    {!labelVisible && onToggleLabel && <td className="px-1 py-2"></td>}
                    {/* Group dropdown */}
                    {groupColors && (
                      <td className="px-4 py-2">
                        {onGroupChange ? (
                          <select
                            value={order.group || ""}
                            onChange={(e) => onGroupChange(order.index, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="text-sm border rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-rose-400"
                            style={groupColor ? { borderLeftWidth: "3px", borderLeftColor: groupColor } : undefined}
                          >
                            <option value="">—</option>
                            {groupNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          order.group && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                              style={{ backgroundColor: groupColor || "#a3a3a3" }}
                            >
                              {order.group}
                            </span>
                          )
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2">{order.customer}</td>
                    {!compact && <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={order.address}>{order.address}</td>}
                    <td className="px-4 py-2 text-gray-600">{order.city}</td>
                    {!compact && <td className="px-4 py-2 text-gray-500">{order.zip_code}</td>}
                    <td className="px-4 py-2 text-gray-500">
                      {itemEntries.length} item{itemEntries.length !== 1 ? "s" : ""}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${order.index}-details`}>
                      <td colSpan={colCount} className="bg-gray-50 px-8 py-2">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-gray-600 max-w-md">
                          {itemEntries.map(([name, qty]) => (
                            <div key={name} className="flex justify-between">
                              <span>{foodColumnLabels?.[name] || name}</span>
                              <span className="text-gray-800 font-medium ml-2">x{qty}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
