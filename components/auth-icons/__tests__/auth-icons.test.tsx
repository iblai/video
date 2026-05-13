import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { AppleIcon, GoogleIcon } from "@/components/auth-icons/auth-icons";

describe("auth-icons", () => {
  it("renders the GoogleIcon SVG", () => {
    const { container } = render(<GoogleIcon />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders the AppleIcon SVG", () => {
    const { container } = render(<AppleIcon />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
