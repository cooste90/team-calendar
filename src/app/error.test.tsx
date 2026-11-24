import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import ErrorPage from "./error";

test("a page that fails to load offers Try again and the reference for support", async () => {
  const retry = vi.fn();
  const error = Object.assign(new Error("hidden in production"), { digest: "2849310573" });
  render(<ErrorPage error={error} retry={retry} />);

  expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  expect(screen.getByText("2849310573")).toBeInTheDocument();
  expect(screen.queryByText("hidden in production")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to the calendar" })).toHaveAttribute("href", "/");

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});

test("an error from the browser has no reference, so none is shown", () => {
  render(<ErrorPage error={new Error("oops")} retry={() => {}} />);
  expect(screen.queryByText(/Reference for support/)).not.toBeInTheDocument();
});
