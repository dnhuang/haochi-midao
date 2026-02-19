import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useDragSelect } from "../../src/hooks/useDragSelect";

describe("useDragSelect", () => {
  it("selectAll selects all indices", () => {
    let current = new Set<number>();
    const onChange = (s: Set<number>) => {
      current = s;
    };

    const { result, rerender } = renderHook(
      ({ selected }) => useDragSelect(3, selected, onChange),
      { initialProps: { selected: current } },
    );

    act(() => result.current.selectAll());
    rerender({ selected: current });

    expect(current).toEqual(new Set([0, 1, 2]));
  });

  it("clearAll clears selection", () => {
    let current = new Set([0, 1, 2]);
    const onChange = (s: Set<number>) => {
      current = s;
    };

    const { result, rerender } = renderHook(
      ({ selected }) => useDragSelect(3, selected, onChange),
      { initialProps: { selected: current } },
    );

    act(() => result.current.clearAll());
    rerender({ selected: current });

    expect(current.size).toBe(0);
  });
});
