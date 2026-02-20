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
  it("renders order table and address inputs", () => {
    render(<RoutingPage orders={mockOrders} password="test" />);
    expect(screen.getByText("张三")).toBeInTheDocument();
    expect(screen.getByText("李四")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Address")).toBeInTheDocument();
    expect(screen.getByLabelText("End Address")).toBeInTheDocument();
  });

  it("renders placeholder when no route result", () => {
    render(<RoutingPage orders={mockOrders} password="test" />);
    expect(
      screen.getByText(
        "Select orders, enter start/end addresses, and click Route",
      ),
    ).toBeInTheDocument();
  });

  it("has a disabled Route button when nothing is selected", () => {
    render(<RoutingPage orders={mockOrders} password="test" />);
    const routeButton = screen.getByText("Route");
    expect(routeButton).toBeDisabled();
  });
});
