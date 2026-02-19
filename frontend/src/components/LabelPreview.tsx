import { useEffect, useState } from "react";
import type { SortedItem, MenuItem } from "../types";
import { fetchMenu } from "../api";

interface LabelPreviewProps {
  sortedItems: SortedItem[];
  password: string;
}

export default function LabelPreview({ sortedItems, password }: LabelPreviewProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetchMenu(password).then((res) => setMenuItems(res.items));
  }, [password]);

  const lookup = new Map(menuItems.map((m) => [m.item_zh, m]));
  const totalLabels = sortedItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">Total labels: {totalLabels}</p>
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-rose-50">
            <th className="border border-gray-300 px-3 py-1.5 text-left text-gray-600 w-10"></th>
            <th className="border border-gray-300 px-3 py-1.5 text-left text-gray-600">Label Text</th>
            <th className="border border-gray-300 px-3 py-1.5 text-right text-gray-600 w-24">Qty</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, i) => {
            const menu = lookup.get(item.item_name);
            const label = menu ? `[${menu.id}]  ${menu.item_short_zh}` : item.item_name;
            return (
              <tr key={item.item_name} className="even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-1.5 text-gray-400 text-right">{i + 1}</td>
                <td className="border border-gray-300 px-3 py-1.5">{label}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-right">{item.quantity}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
