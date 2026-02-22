import { describe, it, expect } from "vitest";
import { assignGroup, sortByGroupOrder } from "../src/groupConfig";
import type { OrderItem } from "../src/types";

function makeOrder(overrides: Partial<OrderItem> & { index: number }): OrderItem {
  return {
    delivery: "1",
    customer: "Test",
    items_ordered: "",
    phone_number: "",
    address: "123 St",
    city: "",
    zip_code: "",
    item_quantities: {},
    ...overrides,
  };
}

describe("assignGroup", () => {
  it("maps unambiguous city to group", () => {
    expect(assignGroup("San Ramon", "94583")).toBe("Pickup");
    expect(assignGroup("Hayward", "94544")).toBe("Fri-P");
    expect(assignGroup("Fremont", "94536")).toBe("Fri-P");
    expect(assignGroup("Albany", "94706")).toBe("Sat-K");
    expect(assignGroup("Cupertino", "95014")).toBe("Sat-P");
  });

  it("maps ambiguous city by zip code", () => {
    expect(assignGroup("San Jose", "95132")).toBe("Fri-P");
    expect(assignGroup("San Jose", "95133")).toBe("Fri-P");
    expect(assignGroup("San Jose", "95129")).toBe("Sat-P");
    expect(assignGroup("Sunnyvale", "94086")).toBe("Fri-K");
    expect(assignGroup("Sunnyvale", "94087")).toBe("Sat-P");
    expect(assignGroup("Mountain View", "94043")).toBe("Fri-K");
    expect(assignGroup("Mountain View", "94040")).toBe("Sat-P");
  });

  it("returns undefined for unmapped city/zip", () => {
    expect(assignGroup("Unknown City", "00000")).toBeUndefined();
    expect(assignGroup("", "")).toBeUndefined();
  });

  it("prefers zip over city when zip is mapped", () => {
    // Even if city is unambiguous, zip takes priority
    expect(assignGroup("Cupertino", "95132")).toBe("Fri-P");
  });
});

describe("sortByGroupOrder", () => {
  it("returns orders unchanged when hasGroups is false", () => {
    const orders = [makeOrder({ index: 0 }), makeOrder({ index: 1 })];
    expect(sortByGroupOrder(orders, false)).toEqual(orders);
  });

  it("sorts predefined groups in GROUP_ORDER sequence", () => {
    const orders = [
      makeOrder({ index: 0, group: "Sat-P" }),
      makeOrder({ index: 1, group: "Pickup" }),
      makeOrder({ index: 2, group: "Fri-K" }),
    ];
    const sorted = sortByGroupOrder(orders, true);
    expect(sorted.map((o) => o.group)).toEqual(["Pickup", "Fri-K", "Sat-P"]);
  });

  it("places ungrouped orders last", () => {
    const orders = [
      makeOrder({ index: 0 }),
      makeOrder({ index: 1, group: "Pickup" }),
      makeOrder({ index: 2 }),
    ];
    const sorted = sortByGroupOrder(orders, true);
    expect(sorted.map((o) => o.group)).toEqual(["Pickup", undefined, undefined]);
  });

  it("places user-added groups after predefined, sorted alphabetically", () => {
    const orders = [
      makeOrder({ index: 0, group: "Zebra" }),
      makeOrder({ index: 1, group: "Sat-K" }),
      makeOrder({ index: 2, group: "Alpha" }),
    ];
    const sorted = sortByGroupOrder(orders, true);
    expect(sorted.map((o) => o.group)).toEqual(["Sat-K", "Alpha", "Zebra"]);
  });

  it("preserves relative order within the same group", () => {
    const orders = [
      makeOrder({ index: 3, group: "Fri-P" }),
      makeOrder({ index: 1, group: "Fri-P" }),
      makeOrder({ index: 2, group: "Fri-P" }),
    ];
    const sorted = sortByGroupOrder(orders, true);
    expect(sorted.map((o) => o.index)).toEqual([3, 1, 2]);
  });
});
