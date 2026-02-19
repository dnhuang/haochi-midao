import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import LoginForm from "../../src/components/LoginForm";

describe("LoginForm", () => {
  it("renders password input and login button", () => {
    render(<LoginForm onLogin={vi.fn()} error={null} loading={false} />);
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("calls onLogin with password on submit", async () => {
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} error={null} loading={false} />);

    await userEvent.type(screen.getByPlaceholderText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(onLogin).toHaveBeenCalledWith("secret");
  });

  it("displays error message", () => {
    render(<LoginForm onLogin={vi.fn()} error="Invalid password" loading={false} />);
    expect(screen.getByText("Invalid password")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<LoginForm onLogin={vi.fn()} error={null} loading={true} />);
    expect(screen.getByRole("button", { name: "Verifying..." })).toBeDisabled();
  });

  it("disables submit when password is empty", () => {
    render(<LoginForm onLogin={vi.fn()} error={null} loading={false} />);
    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
  });
});
