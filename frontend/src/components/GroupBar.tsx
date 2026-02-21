import { useState } from "react";
import type { OrderItem } from "../types";

interface GroupBarProps {
  groupColors: Record<string, string>;
  orders: OrderItem[];
  onAddGroup: (name: string) => void;
  onDeleteGroup: (name: string) => void;
  onSelectGroup?: (name: string) => void;
  readOnly?: boolean;
}

export default function GroupBar({
  groupColors,
  orders,
  onAddGroup,
  onDeleteGroup,
  onSelectGroup,
  readOnly,
}: GroupBarProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const groupNames = Object.keys(groupColors);
  const ungroupedCount = orders.filter((o) => !o.group).length;

  const countByGroup = (name: string) =>
    orders.filter((o) => o.group === name).length;

  const handleSubmit = () => {
    const trimmed = newName.trim();
    if (trimmed && !groupColors[trimmed]) {
      onAddGroup(trimmed);
    }
    setNewName("");
    setAdding(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      {groupNames.map((name) => (
        <div
          key={name}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border border-gray-200 bg-white ${
            onSelectGroup ? "cursor-pointer hover:bg-gray-50" : ""
          }`}
          onClick={() => onSelectGroup?.(name)}
        >
          <span
            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: groupColors[name] }}
          />
          <span className="text-gray-700">
            {name} ({countByGroup(name)})
          </span>
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup(name);
              }}
              className="text-gray-400 hover:text-red-500 ml-0.5 text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {ungroupedCount > 0 && (
        <span className="text-sm text-gray-400">{ungroupedCount} ungrouped</span>
      )}

      {!readOnly && (
        <>
          {adding ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewName("");
                  }
                }}
                autoFocus
                placeholder="Group name"
                className="px-2 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-rose-400 w-28"
              />
              <button
                onClick={handleSubmit}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-full px-2.5 py-1 hover:border-rose-400 hover:text-rose-600"
            >
              + Add Group
            </button>
          )}
        </>
      )}
    </div>
  );
}
