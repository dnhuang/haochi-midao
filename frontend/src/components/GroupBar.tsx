import { useState } from "react";
import type { OrderItem } from "../types";

interface GroupBarProps {
  groupColors: Record<string, string>;
  orders: OrderItem[];
  onAddGroup: (name: string) => void;
  onDeleteGroup: (name: string) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onSelectGroup?: (name: string) => void;
  readOnly?: boolean;
}

export default function GroupBar({
  groupColors,
  orders,
  onAddGroup,
  onDeleteGroup,
  onRenameGroup,
  onSelectGroup,
  readOnly,
}: GroupBarProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  // Rename state
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const groupNames = Object.keys(groupColors);
  const ungroupedCount = orders.filter((o) => !o.group).length;
  const countByGroup = (name: string) => orders.filter((o) => o.group === name).length;

  // ── Add group ──────────────────────────────────────────────
  const handleAddSubmit = () => {
    const trimmed = newName.trim();
    if (trimmed && !groupColors[trimmed]) {
      onAddGroup(trimmed);
    }
    setNewName("");
    setAdding(false);
  };

  // ── Rename group ───────────────────────────────────────────
  const handleRenameStart = (name: string, e: React.MouseEvent) => {
    if (readOnly || !onRenameGroup) return;
    e.stopPropagation();
    setRenamingGroup(name);
    setRenameValue(name);
    setRenameError(null);
  };

  const handleRenameCommit = () => {
    if (!renamingGroup) return;
    const trimmed = renameValue.trim();

    // No change or empty — just close
    if (!trimmed || trimmed === renamingGroup) {
      setRenamingGroup(null);
      setRenameError(null);
      return;
    }

    // Conflict — shake + show error, stay in edit mode
    if (groupColors[trimmed]) {
      setRenameError(`"${trimmed}" already exists`);
      setShakeKey((k) => k + 1);
      return;
    }

    onRenameGroup!(renamingGroup, trimmed);
    setRenamingGroup(null);
    setRenameError(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameCommit();
    if (e.key === "Escape") {
      setRenamingGroup(null);
      setRenameError(null);
    }
  };

  return (
    <div className="flex items-start gap-2 flex-wrap mb-3">
      {groupNames.map((name) => {
        const isRenaming = renamingGroup === name;
        const color = groupColors[name];

        return (
          <div
            key={name}
            className={`inline-flex items-start gap-1.5 px-2.5 py-1 rounded-full text-sm border border-gray-200 bg-white ${
              !isRenaming && onSelectGroup ? "cursor-pointer hover:bg-gray-50" : ""
            }`}
            onClick={() => !isRenaming && onSelectGroup?.(name)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 mt-1"
              style={{ backgroundColor: color }}
            />

            {isRenaming ? (
              /* Rename mode */
              <div className="flex flex-col">
                <div key={shakeKey} className={renameError ? "animate-shake" : ""}>
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => {
                      setRenameValue(e.target.value);
                      setRenameError(null);
                    }}
                    onBlur={handleRenameCommit}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-sm w-28 px-1 border-b focus:outline-none bg-transparent ${
                      renameError ? "border-red-400 text-red-600" : "border-gray-400"
                    }`}
                  />
                </div>
                {renameError && (
                  <span className="text-xs text-red-500 mt-0.5 whitespace-nowrap">
                    {renameError}
                  </span>
                )}
              </div>
            ) : (
              /* Display mode */
              <span
                className={`text-gray-700 leading-5 ${
                  !readOnly && onRenameGroup ? "cursor-text hover:text-rose-600" : ""
                }`}
                title={!readOnly && onRenameGroup ? "Click to rename" : undefined}
                onClick={(e) => handleRenameStart(name, e)}
              >
                {name} ({countByGroup(name)})
              </span>
            )}

            {!readOnly && !isRenaming && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(name);
                }}
                className="text-gray-400 hover:text-red-500 ml-0.5 text-xs leading-5"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {ungroupedCount > 0 && (
        <span className="text-sm text-gray-400 py-1">{ungroupedCount} ungrouped</span>
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
                  if (e.key === "Enter") handleAddSubmit();
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
                onClick={handleAddSubmit}
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
