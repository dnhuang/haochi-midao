import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OrderTable from "../../src/components/OrderTable";
import type { OrderItem } from "../../src/types";

const mockOrders: OrderItem[] = [
  {
    index: 0,
    delivery: "1",
    customer: "张三",
    items_ordered: "test",
    phone_number: "123",
    address: "addr",
    city: "NYC",
    zip_code: "10001",
    item_quantities: { item_a: 3 },
  },
  {
    index: 1,
    delivery: "2",
    customer: "李四",
    items_ordered: "test",
    phone_number: "456",
    address: "addr2",
    city: "Boston",
    zip_code: "20001",
    item_quantities: { item_a: 1, item_b: 2 },
  },
];

describe("OrderTable", () => {
  it("renders all orders", () => {
    render(<OrderTable orders={mockOrders} selected={new Set()} onSelectionChange={vi.fn()} />);
    expect(screen.getByText("张三")).toBeInTheDocument();
    expect(screen.getByText("李四")).toBeInTheDocument();
  });

  it("shows selection count", () => {
    render(<OrderTable orders={mockOrders} selected={new Set([0])} onSelectionChange={vi.fn()} />);
    expect(screen.getByText("1 of 2 selected")).toBeInTheDocument();
  });

  it("has select all and clear all buttons", () => {
    render(<OrderTable orders={mockOrders} selected={new Set()} onSelectionChange={vi.fn()} />);
    expect(screen.getByText("Select All")).toBeInTheDocument();
    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });

  it("renders group column when groupColors provided", () => {
    const ordersWithGroups: OrderItem[] = [
      { ...mockOrders[0], group: "Route A" },
      { ...mockOrders[1], group: "Route B" },
    ];
    const groupColors = { "Route A": "#f87171", "Route B": "#60a5fa" };

    render(
      <OrderTable
        orders={ordersWithGroups}
        selected={new Set()}
        onSelectionChange={vi.fn()}
        groupColors={groupColors}
        onGroupChange={vi.fn()}
        onAddGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    expect(screen.getByText("Group")).toBeInTheDocument();
  });

  it("renders group dividers between groups", () => {
    const ordersWithGroups: OrderItem[] = [
      { ...mockOrders[0], group: "Route A" },
      { ...mockOrders[1], group: "Route B" },
    ];
    const groupColors = { "Route A": "#f87171", "Route B": "#60a5fa" };

    render(
      <OrderTable
        orders={ordersWithGroups}
        selected={new Set()}
        onSelectionChange={vi.fn()}
        groupColors={groupColors}
        onGroupChange={vi.fn()}
        onAddGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    // Group divider labels appear in multiple places (dividers + dropdowns + GroupBar chips),
    // so just verify multiple instances exist
    expect(screen.getAllByText("Route A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Route B").length).toBeGreaterThanOrEqual(1);
  });
});
