import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BusinessUnitSwitcher } from "./business-unit-switcher";

const west = { slug: "west-operations", name: "West Operations", hidden: false };
const corporate = { slug: "corporate-services", name: "Corporate Services", hidden: true };

describe("BusinessUnitSwitcher", () => {
  it("isn't shown when there's only one business unit to see", () => {
    const { container } = render(
      <BusinessUnitSwitcher businessUnits={[west]} value={west.slug} onChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the business units, marks hidden ones, and reports the choice", async () => {
    const onChange = vi.fn();
    render(
      <BusinessUnitSwitcher
        businessUnits={[west, corporate]}
        value={west.slug}
        onChange={onChange}
      />,
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Business unit" }),
      "Corporate Services (hidden)",
    );
    expect(onChange).toHaveBeenCalledWith("corporate-services");
  });
});
