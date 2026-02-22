import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RoutingPage from "../../src/pages/RoutingPage";
import type { OrderItem } from "../../src/types";

const mockOrders: OrderItem[] = [
  {
    index: 0,
    delivery: "1",
    customer: "张三",
    items_ordered: "test",
    phone_number: "123",
    address: "123 Main St",
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
    address: "456 Oak Ave",
    city: "Boston",
    zip_code: "20001",
    item_quantities: { item_a: 1, item_b: 2 },
  },
];

describe("RoutingPage", () => {
  it("renders order table and start address input with default", () => {
    render(<RoutingPage orders={mockOrders} password="test" groupColors={{}} />);
    expect(screen.getByText("张三")).toBeInTheDocument();
    expect(screen.getByText("李四")).toBeInTheDocument();
    const startInput = screen.getByLabelText("Start Address") as HTMLInputElement;
    expect(startInput).toBeInTheDocument();
    expect(startInput.value).toBe("2812 Pelican Drive, Union City, CA 94587");
  });

  it("renders placeholder when no route result", () => {
    render(<RoutingPage orders={mockOrders} password="test" groupColors={{}} />);
    expect(
      screen.getByText(
        "Select orders and click Route to optimize delivery order",
      ),
    ).toBeInTheDocument();
  });

  it("has a disabled Route button when nothing is selected", () => {
    render(<RoutingPage orders={mockOrders} password="test" groupColors={{}} />);
    const routeButton = screen.getByText("Route");
    expect(routeButton).toBeDisabled();
  });

  it("renders group chips when groupColors provided", () => {
    const ordersWithGroups: OrderItem[] = [
      { ...mockOrders[0], group: "Area 1" },
      { ...mockOrders[1], group: "Area 2" },
    ];
    const groupColors = { "Area 1": "#f87171", "Area 2": "#60a5fa" };

    render(
      <RoutingPage orders={ordersWithGroups} password="test" groupColors={groupColors} />,
    );

    // Group names appear in GroupBar chips, dividers, and badges
    expect(screen.getAllByText(/Area 1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Area 2/).length).toBeGreaterThanOrEqual(1);
  });
});
