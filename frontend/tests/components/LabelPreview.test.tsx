import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LabelPreview from "../../src/components/LabelPreview";

vi.mock("../../src/api", () => ({
  fetchMenu: vi.fn().mockResolvedValue({
    items: [
      { id: 1, item_zh: "烧卖15个/份", item_short_zh: "烧卖", item_en: "shao mai" },
    ],
  }),
}));

describe("LabelPreview", () => {
  it("shows total label count", async () => {
    const items = [
      { item_name: "烧卖15个/份", quantity: 3 },
      { item_name: "馄饨50/份", quantity: 2 },
    ];
    render(<LabelPreview sortedItems={items} password="test" />);
    expect(screen.getByText("Total labels: 5")).toBeInTheDocument();
  });
});
