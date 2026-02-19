import { useState } from "react";
import type { MenuItem, OrderItem } from "../types";

interface ItemRow {
  menuItem: string;
  quantity: number;
}

interface AddOrderFormProps {
  menuItems: MenuItem[];
  nextDelivery: string;
  nextIndex: number;
  onAdd: (order: OrderItem) => void;
  onCancel: () => void;
  /** When editing, pre-populate the form */
  initial?: OrderItem;
}

export default function AddOrderForm({
  menuItems,
  nextDelivery,
  nextIndex,
  onAdd,
  onCancel,
  initial,
}: AddOrderFormProps) {
  const [customer, setCustomer] = useState(initial?.customer ?? "");
  const [phone, setPhone] = useState(initial?.phone_number ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [zip, setZip] = useState(initial?.zip_code ?? "");
  const [items, setItems] = useState<ItemRow[]>(
    initial
      ? Object.entries(initial.item_quantities).map(([menuItem, quantity]) => ({ menuItem, quantity }))
      : [{ menuItem: "", quantity: 1 }],
  );
  const [error, setError] = useState<string | null>(null);

  const updateItem = (idx: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { menuItem: "", quantity: 1 }]);
  };

  const incrementQty = (idx: number) => {
    setItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, quantity: row.quantity + 1 } : row)),
    );
  };

  const decrementQty = (idx: number) => {
    setItems((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row,
      ),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = {
      customer: customer.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      zip: zip.trim(),
    };

    if (!trimmed.customer || !trimmed.phone || !trimmed.address || !trimmed.city || !trimmed.zip) {
      setError("All fields are required.");
      return;
    }

    if (items.length === 0) {
      setError("At least one item is required.");
      return;
    }

    const itemQuantities: Record<string, number> = {};
    for (const row of items) {
      if (!row.menuItem) {
        setError("Each item row must have a selected menu item.");
        return;
      }
      if (row.quantity <= 0) {
        setError("Quantity must be a positive integer.");
        return;
      }
      itemQuantities[row.menuItem] = (itemQuantities[row.menuItem] || 0) + row.quantity;
    }

    const itemsOrdered = Object.entries(itemQuantities)
      .map(([name, qty]) => `${name}x${qty}`)
      .join("\uFF0C ");

    const order: OrderItem = {
      index: initial?.index ?? nextIndex,
      delivery: initial?.delivery ?? nextDelivery,
      customer: trimmed.customer,
      items_ordered: itemsOrdered,
      phone_number: trimmed.phone,
      address: trimmed.address,
      city: trimmed.city,
      zip_code: trimmed.zip,
      item_quantities: itemQuantities,
    };

    onAdd(order);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-rose-50 rounded-lg shadow-xl p-6 space-y-4 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in"
      >
        <h3 className="text-base font-semibold text-gray-800">
          {initial ? "Edit Order" : "Add Manual Order"}
        </h3>

        {/* Customer info fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer Name</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zip Code</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            />
          </div>
        </div>

        {/* Item rows */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Items</label>
          <div className="space-y-2">
            {items.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={row.menuItem}
                  onChange={(e) => updateItem(idx, "menuItem", e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Select item...</option>
                  {menuItems.map((mi) => (
                    <option key={mi.id} value={mi.item_zh}>
                      {mi.item_short_zh} ({mi.item_zh})
                    </option>
                  ))}
                </select>
                {/* Quantity stepper */}
                <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => decrementQty(idx)}
                    className="px-1.5 py-1 text-gray-500 hover:bg-gray-100 text-sm leading-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h8" /></svg>
                  </button>
                  <input
                    type="text"
                    value={row.quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) updateItem(idx, "quantity", v);
                      else if (e.target.value === "") updateItem(idx, "quantity", 1);
                    }}
                    className="w-10 text-center text-sm py-1 border-x border-gray-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => incrementQty(idx)}
                    className="px-1.5 py-1 text-gray-500 hover:bg-gray-100 text-sm leading-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2v8M2 6h8" /></svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItemRow}
            className="mt-2 text-sm text-gray-700 border border-gray-300 rounded px-2 py-0.5 hover:bg-rose-600 hover:text-white hover:border-rose-600"
          >
            + Add Item
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-1.5 bg-rose-600 text-white text-sm rounded border border-rose-700 hover:bg-rose-700"
          >
            {initial ? "Save Changes" : "Add Order"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
