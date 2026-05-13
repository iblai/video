import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));

import { Footer } from "@/components/footer";

describe("Footer", () => {
  it("renders the privacy + terms links to ibl.ai and a powered-by logo", () => {
    render(<Footer />);
    const privacy = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacy).toHaveAttribute("href", "https://ibl.ai/privacy-policy");
    expect(privacy).toHaveAttribute("target", "_blank");

    const terms = screen.getByRole("link", { name: /terms & conditions/i });
    expect(terms).toHaveAttribute("href", "https://ibl.ai/terms-of-use");

    expect(screen.getByText(/powered by/i)).toBeInTheDocument();
    expect(screen.getByAltText(/ibl\.ai/i)).toBeInTheDocument();
  });
});
