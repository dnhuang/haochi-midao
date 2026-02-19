import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FileUpload from "../../src/components/FileUpload";

describe("FileUpload", () => {
  it("renders file input and process button", () => {
    render(<FileUpload password="test" onUpload={() => {}} />);
    expect(screen.getByText("Process")).toBeInTheDocument();
    expect(screen.getByText("Upload WeChat Export")).toBeInTheDocument();
  });
});
