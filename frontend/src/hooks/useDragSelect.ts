import { useCallback, useEffect, useRef } from "react";

type DragMode = "select" | "deselect" | null;

export function useDragSelect(
  count: number,
  selected: Set<number>,
  onChange: (selected: Set<number>) => void,
) {
  const dragMode = useRef<DragMode>(null);

  const onMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      const next = new Set(selected);
      if (selected.has(index)) {
        dragMode.current = "deselect";
        next.delete(index);
      } else {
        dragMode.current = "select";
        next.add(index);
      }
      onChange(next);
    },
    [selected, onChange],
  );

  const onMouseEnter = useCallback(
    (index: number) => {
      if (!dragMode.current) return;
      const next = new Set(selected);
      if (dragMode.current === "select") {
        next.add(index);
      } else {
        next.delete(index);
      }
      onChange(next);
    },
    [selected, onChange],
  );

  useEffect(() => {
    const handleMouseUp = () => {
      dragMode.current = null;
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const selectAll = useCallback(() => {
    onChange(new Set(Array.from({ length: count }, (_, i) => i)));
  }, [count, onChange]);

  const clearAll = useCallback(() => {
    onChange(new Set());
  }, [onChange]);

  return {
    handlers: { onMouseDown, onMouseEnter },
    selectAll,
    clearAll,
  };
}
