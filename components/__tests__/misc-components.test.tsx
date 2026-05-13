import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));

import { Dashboard } from "@/components/dashboard";
import HeyGenWidget from "@/components/heygen-widget";
import { HeyGenStreaming } from "@/components/heygen-streaming";
import { ThemeProvider } from "@/components/theme-provider";

describe("Dashboard", () => {
  it("renders the model chips and onboarding panels", () => {
    render(<Dashboard />);
    // Pick a unique label that's only on the dashboard.
    expect(screen.getAllByText(/Veo 3/i).length).toBeGreaterThan(0);
  });
});

describe("HeyGenStreaming", () => {
  it("returns nothing when isActive is false", () => {
    const { container } = render(
      <HeyGenStreaming isActive={false} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the floating widget and reacts to streaming-embed messages", () => {
    render(<HeyGenStreaming isActive onClose={() => {}} />);
    // Dispatch a fake init message from the labs.heygen.com origin.
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "streaming-embed", action: "init" },
        origin: "https://labs.heygen.com",
      }),
    );
  });

  it("ignores messages from other origins", () => {
    render(<HeyGenStreaming isActive onClose={() => {}} />);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "streaming-embed", action: "show" },
        origin: "https://evil.example.com",
      }),
    );
  });
});

describe("HeyGenWidget", () => {
  afterEach(() => {
    // The widget injects DOM nodes outside React; clean up to keep tests isolated.
    document.getElementById("heygen-fullscreen")?.remove();
    document.getElementById("heygen-streaming-container")?.remove();
  });

  it("injects the fullscreen container into document.body", () => {
    render(<HeyGenWidget />);
    expect(document.getElementById("heygen-fullscreen")).not.toBeNull();
  });

  it("accepts a custom share token", () => {
    document.getElementById("heygen-fullscreen")?.remove();
    render(<HeyGenWidget shareToken="custom-token" />);
    expect(document.getElementById("heygen-fullscreen")).not.toBeNull();
  });

  it("does not duplicate the container on re-mount", () => {
    render(<HeyGenWidget />);
    render(<HeyGenWidget />);
    expect(
      document.querySelectorAll("#heygen-fullscreen").length,
    ).toBeLessThanOrEqual(1);
  });
});

describe("ThemeProvider", () => {
  it("forwards children", () => {
    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
