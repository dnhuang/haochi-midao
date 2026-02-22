import { Fragment, useEffect, useRef, useState } from "react";
import type { MenuItem, OrderItem, UploadResponse } from "../types";
import { fetchMenu } from "../api";
import DiscrepancyWarning from "../components/DiscrepancyWarning";
import AddOrderForm from "../components/AddOrderForm";
import GroupBar from "../components/GroupBar";

interface PreviewEditPageProps {
  uploadData: UploadResponse;
  orders: OrderItem[];
  onOrdersChange: (orders: OrderItem[]) => void;
  onLabelChange: (index: number, newLabel: string) => void;
  password: string;
  onConfirm: () => void;
  groupColors: Record<string, string>;
  onGroupChange: (index: number, group: string) => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: (name: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onReorder: (reorderedOrders: OrderItem[]) => void;
  showLabel: boolean;
  onToggleLabel: () => void;
  foodColumnLabels?: Record<string, string>;
}

/** Sort orders by group: ungrouped first, then alphabetical by group name */
function sortByGroup(orders: OrderItem[], hasGroups: boolean): OrderItem[] {
  if (!hasGroups) return orders;
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

export default function PreviewEditPage({
  uploadData,
  orders,
  onOrdersChange,
  onLabelChange,
  password,
  onConfirm,
  groupColors,
  onGroupChange,
  onAddGroup,
  onDeleteGroup,
  onRenameGroup,
  onReorder,
  showLabel,
  onToggleLabel,
  foodColumnLabels,
}: PreviewEditPageProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const hasGroups = Object.keys(groupColors).length > 0;
  const sortedOrders = sortByGroup(orders, hasGroups);
  const groupBoundaries = hasGroups ? getGroupBoundaries(sortedOrders) : new Map<number, string>();
  const groupNames = Object.keys(groupColors);

  useEffect(() => {
    fetchMenu(password).then((res) => setMenuItems(res.items)).catch(() => {});
  }, [password]);

  const toggleExpand = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAdd = (order: OrderItem) => {
    onOrdersChange([...orders, { ...order, isManual: true }]);
    setShowAddForm(false);
  };

  const handleEdit = (order: OrderItem) => {
    onOrdersChange(orders.map((o) => (o.index === order.index ? { ...order, isManual: true } : o)));
    setEditingOrder(null);
  };

  const handleRemove = (index: number) => {
    onOrdersChange(orders.filter((o) => o.index !== index));
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
    if (dragIndexRef.current === null) return;

    const draggedIndex = dragIndexRef.current;
    const draggedOrder = sortedOrders.find((o) => o.index === draggedIndex);
    const targetOrder = sortedOrders[targetPosition];
    if (!draggedOrder || !targetOrder) return;

    // Only allow reorder within the same group
    if (draggedOrder.group !== targetOrder.group) {
      handleDragEnd();
      return;
    }

    const newOrders = [...orders];
    const fromIdx = newOrders.findIndex((o) => o.index === draggedIndex);
    const [moved] = newOrders.splice(fromIdx, 1);
    const toIdx = newOrders.findIndex((o) => o.index === targetOrder.index);
    newOrders.splice(toIdx, 0, moved);
    onReorder(newOrders);
    handleDragEnd();
  };

  const handleFieldChange = (index: number, field: keyof OrderItem, value: string) => {
    onOrdersChange(orders.map((o) => (o.index === index ? { ...o, [field]: value } : o)));
  };

  const requiredFields: (keyof OrderItem)[] = ["customer", "address", "city", "zip_code"];
  const hasEmptyRequired = orders.some((o) =>
    requiredFields.some((f) => !(o[f] as string).trim()),
  );

  const nextIndex = orders.length > 0 ? Math.max(...orders.map((o) => o.index)) + 1 : 0;
  const maxManualNum = orders
    .filter((o) => /^M\d+$/.test(o.delivery))
    .map((o) => parseInt(o.delivery.slice(1)))
    .reduce((max, n) => Math.max(max, n), 0);
  const nextLabel = `M${maxManualNum + 1}`;

  const colCount = 8 + (showLabel ? 1 : 0); // drag + expand + [label?] + group + customer + address + city + zip + items + actions

  return (
    <div className="space-y-4">
      <DiscrepancyWarning discrepancies={uploadData.discrepancies} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Preview Orders ({orders.length})
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-1.5 text-sm border border-rose-600 text-rose-600 rounded hover:bg-rose-600 hover:text-white"
          >
            Add Order
          </button>
          <button
            onClick={onConfirm}
            disabled={hasEmptyRequired}
            className="px-4 py-1.5 text-sm bg-rose-600 text-white rounded border border-rose-700 hover:bg-rose-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>

      {hasEmptyRequired && (
        <p className="text-sm text-red-500">Some orders have empty required fields</p>
      )}

      {/* GroupBar */}
      <GroupBar
        groupColors={groupColors}
        orders={orders}
        onAddGroup={onAddGroup}
        onDeleteGroup={onDeleteGroup}
        onRenameGroup={onRenameGroup}
      />

      {/* Order table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-rose-50 text-left text-gray-600">
            <tr>
              <th className="w-8 px-1 py-2"></th>
              <th className="w-8 px-2 py-2"></th>
              {showLabel ? (
                <th className="px-4 py-2">
                  <span className="inline-flex items-center gap-1">
                    Label
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
                  </span>
                </th>
              ) : (
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
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Zip</th>
              <th className="px-4 py-2">Items</th>
              <th className="w-20 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order, position) => {
              const isExpanded = expanded.has(order.index);
              const isManual = !!order.isManual;
              const itemEntries = Object.entries(order.item_quantities);
              const groupColor = order.group && groupColors[order.group];
              const boundary = groupBoundaries.get(position);

              return (
                <Fragment key={order.index}>
                  {/* Group divider row */}
                  {boundary && (
                    <tr>
                      <td colSpan={colCount + 1} className="px-0 py-0">
                        <div
                          className="flex items-center gap-2 px-4 py-1 text-xs font-medium text-gray-500 bg-gray-50"
                          style={{ borderLeft: `3px solid ${groupColors[boundary] || "#ccc"}` }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: groupColors[boundary] || "#ccc" }}
                          />
                          {boundary}
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr
                    onDragOver={(e) => handleDragOver(e, position)}
                    onDrop={(e) => handleDrop(e, position)}
                    className={`border-t border-gray-100 hover:bg-gray-50 ${
                      dropTarget === position ? "border-t-2 border-t-rose-400" : ""
                    }`}
                    style={groupColor ? { borderLeft: `3px solid ${groupColor}` } : undefined}
                  >
                    {/* Drag handle */}
                    <td className="px-1 py-2 text-center">
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(order.index);
                        }}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab text-gray-300 hover:text-gray-500 select-none"
                      >
                        ⠿
                      </span>
                    </td>
                    {/* Expand button */}
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleExpand(order.index)}
                        className="text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center"
                      >
                        {isExpanded ? "\u25BC" : "\u25B6"}
                      </button>
                    </td>
                    {showLabel ? (
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={order.delivery}
                          onChange={(e) => onLabelChange(order.index, e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-rose-400 focus:outline-none w-20 text-gray-500"
                        />
                      </td>
                    ) : (
                      <td className="px-1 py-2"></td>
                    )}
                    {/* Group dropdown */}
                    <td className="px-4 py-2">
                      <select
                        value={order.group || ""}
                        onChange={(e) => onGroupChange(order.index, e.target.value)}
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
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={order.customer}
                          onChange={(e) => handleFieldChange(order.index, "customer", e.target.value)}
                          className={`bg-transparent border-b ${!order.customer.trim() ? "border-red-400" : "border-transparent"} hover:border-gray-300 focus:border-rose-400 focus:outline-none`}
                        />
                        {!order.customer.trim() && <span className="text-red-400 text-xs">*</span>}
                        {isManual && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            Manual
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={order.address}
                          onChange={(e) => handleFieldChange(order.index, "address", e.target.value)}
                          className={`bg-transparent border-b ${!order.address.trim() ? "border-red-400" : "border-transparent"} hover:border-gray-300 focus:border-rose-400 focus:outline-none w-full`}
                        />
                        {!order.address.trim() && <span className="text-red-400 text-xs">*</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={order.city}
                          onChange={(e) => handleFieldChange(order.index, "city", e.target.value)}
                          className={`bg-transparent border-b ${!order.city.trim() ? "border-red-400" : "border-transparent"} hover:border-gray-300 focus:border-rose-400 focus:outline-none w-24`}
                        />
                        {!order.city.trim() && <span className="text-red-400 text-xs">*</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={order.zip_code}
                          onChange={(e) => handleFieldChange(order.index, "zip_code", e.target.value)}
                          className={`bg-transparent border-b ${!order.zip_code.trim() ? "border-red-400" : "border-transparent"} hover:border-gray-300 focus:border-rose-400 focus:outline-none w-20`}
                        />
                        {!order.zip_code.trim() && <span className="text-red-400 text-xs">*</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {itemEntries.length} item{itemEntries.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isManual && (
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit pencil icon */}
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="text-gray-400 hover:text-rose-600 transition-colors"
                            title="Edit"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.5 1.5l3 3-9 9H1.5v-3l9-9z" />
                              <path d="M8.5 3.5l3 3" />
                            </svg>
                          </button>
                          {/* Remove X icon */}
                          <button
                            onClick={() => handleRemove(order.index)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M3.5 3.5l8 8M11.5 3.5l-8 8" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${order.index}-details`}>
                      <td colSpan={colCount + 1} className="bg-gray-50 px-8 py-2">
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

      {/* Add order modal */}
      {showAddForm && (
        <AddOrderForm
          menuItems={menuItems}
          nextDelivery={nextLabel}
          nextIndex={nextIndex}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit order modal */}
      {editingOrder && (
        <AddOrderForm
          menuItems={menuItems}
          nextDelivery={nextLabel}
          nextIndex={nextIndex}
          onAdd={handleEdit}
          onCancel={() => setEditingOrder(null)}
          initial={editingOrder}
        />
      )}
    </div>
  );
}
