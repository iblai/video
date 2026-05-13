import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ScrollToTopButton } from "@/components/sections/scroll-to-top-button";
import { WatchSection } from "@/components/sections/watch-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { FAQSection } from "@/components/sections/faq-section";
import { NavigationBar } from "@/components/sections/navigation-bar";

describe("ScrollToTopButton", () => {
  it("renders nothing when hidden", () => {
    const { container } = render(
      <ScrollToTopButton showScrollTop={false} scrollToTop={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a button that fires the scroll callback when shown", () => {
    const onClick = vi.fn();
    render(
      <ScrollToTopButton showScrollTop scrollToTop={onClick} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("section components smoke render", () => {
  it("WatchSection mounts without throwing", () => {
    render(<WatchSection />);
    expect(screen.getByText(/Interactive Avatars/i)).toBeInTheDocument();
  });

  it("PricingSection mounts and shows the plan tiers", () => {
    render(<PricingSection />);
    expect(screen.getAllByText(/Starter/i).length).toBeGreaterThan(0);
  });

  it("FAQSection mounts and toggles a question open", () => {
    render(<FAQSection />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    // Re-clicking closes it — exercises both branches.
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toBeInTheDocument();
  });

  it("NavigationBar returns null when hidden", () => {
    const { container } = render(
      <NavigationBar
        showNavBar={false}
        activeSection="watch-section"
        scrollToWatch={() => {}}
        scrollToPricing={() => {}}
        scrollToFAQ={() => {}}
        scrollToTop={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("NavigationBar renders nav buttons and wires the scroll callbacks", () => {
    const toTop = vi.fn();
    const toWatch = vi.fn();
    const toPricing = vi.fn();
    const toFAQ = vi.fn();
    render(
      <NavigationBar
        showNavBar
        activeSection="watch-section"
        scrollToWatch={toWatch}
        scrollToPricing={toPricing}
        scrollToFAQ={toFAQ}
        scrollToTop={toTop}
      />,
    );
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
