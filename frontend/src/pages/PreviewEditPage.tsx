import { Fragment, useEffect, useState } from "react";
import type { MenuItem, OrderItem, UploadResponse } from "../types";
import { fetchMenu } from "../api";
import DiscrepancyWarning from "../components/DiscrepancyWarning";
import AddOrderForm from "../components/AddOrderForm";

interface PreviewEditPageProps {
  uploadData: UploadResponse;
  password: string;
  onConfirm: (orders: OrderItem[]) => void;
}

export default function PreviewEditPage({
  uploadData,
  password,
  onConfirm,
}: PreviewEditPageProps) {
  const [orders, setOrders] = useState<OrderItem[]>(uploadData.orders);
  const [manualIndices, setManualIndices] = useState<Set<number>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
    setOrders((prev) => [...prev, order]);
    setManualIndices((prev) => new Set(prev).add(order.index));
    setShowAddForm(false);
  };

  const handleEdit = (order: OrderItem) => {
    setOrders((prev) => prev.map((o) => (o.index === order.index ? order : o)));
    setEditingOrder(null);
  };

  const handleRemove = (index: number) => {
    setOrders((prev) => prev.filter((o) => o.index !== index));
    setManualIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleConfirm = () => {
    const reindexed = orders.map((o, i) => ({ ...o, index: i }));
    onConfirm(reindexed);
  };

  const nextIndex = orders.length > 0 ? Math.max(...orders.map((o) => o.index)) + 1 : 0;
  const nextDelivery = orders.length > 0 ? Math.max(...orders.map((o) => o.delivery)) + 1 : 1;

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
            onClick={handleConfirm}
            className="px-4 py-1.5 text-sm bg-rose-600 text-white rounded border border-rose-700 hover:bg-rose-700"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Order table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-rose-50 text-left text-gray-600">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Items</th>
              <th className="w-20 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isExpanded = expanded.has(order.index);
              const isManual = manualIndices.has(order.index);
              const itemEntries = Object.entries(order.item_quantities);
              return (
                <Fragment key={order.index}>
                  <tr className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleExpand(order.index)}
                        className="text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center"
                      >
                        {isExpanded ? "\u25BC" : "\u25B6"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{order.delivery}</td>
                    <td className="px-4 py-2">
                      {order.customer}
                      {isManual && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{order.city}</td>
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
                      <td colSpan={6} className="bg-gray-50 px-8 py-2">
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

      {/* Add order modal */}
      {showAddForm && (
        <AddOrderForm
          menuItems={menuItems}
          nextDelivery={nextDelivery}
          nextIndex={nextIndex}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit order modal */}
      {editingOrder && (
        <AddOrderForm
          menuItems={menuItems}
          nextDelivery={nextDelivery}
          nextIndex={nextIndex}
          onAdd={handleEdit}
          onCancel={() => setEditingOrder(null)}
          initial={editingOrder}
        />
      )}
    </div>
  );
}
