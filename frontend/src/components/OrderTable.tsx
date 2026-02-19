import { Fragment, useState } from "react";
import type { OrderItem } from "../types";
import { useDragSelect } from "../hooks/useDragSelect";

interface OrderTableProps {
  orders: OrderItem[];
  selected: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  /** Optional action element rendered at the right end of the toolbar */
  toolbarAction?: React.ReactNode;
}

export default function OrderTable({ orders, selected, onSelectionChange, toolbarAction }: OrderTableProps) {
  const { handlers, selectAll, clearAll } = useDragSelect(orders.length, selected, onSelectionChange);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  return (
    <div>
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
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-rose-50 text-left text-gray-600">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isExpanded = expanded.has(order.index);
              const itemEntries = Object.entries(order.item_quantities);
              return (
                <Fragment key={order.index}>
                  <tr
                    onMouseDown={(e) => handlers.onMouseDown(order.index, e)}
                    onMouseEnter={() => handlers.onMouseEnter(order.index)}
                    className={`border-t border-gray-100 cursor-pointer select-none ${
                      selected.has(order.index) ? "bg-rose-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={(e) => toggleExpand(order.index, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center"
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{order.delivery}</td>
                    <td className="px-4 py-2">{order.customer}</td>
                    <td className="px-4 py-2 text-gray-600">{order.city}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {itemEntries.length} item{itemEntries.length !== 1 ? "s" : ""}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${order.index}-details`}>
                      <td colSpan={5} className="bg-gray-50 px-8 py-2">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-gray-600 max-w-md">
                          {itemEntries.map(([name, qty]) => (
                            <div key={name} className="flex justify-between">
                              <span>{name}</span>
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
