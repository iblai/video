import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

let mockedPathname = "/ai-avatar/generate";
let mockedSidebar = {
  state: "expanded" as "expanded" | "collapsed",
  toggleSidebar: vi.fn(),
  isMobile: false,
  openMobile: false,
  setOpenMobile: vi.fn(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => mockedSidebar,
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  // Tooltip content is hidden until hovered; skip rendering so the labels
  // don't appear twice in the DOM tree during smoke tests.
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

import { AppSidebar } from "@/components/app-sidebar";

describe("AppSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedPathname = "/ai-avatar/generate";
    mockedSidebar = {
      state: "expanded",
      toggleSidebar: vi.fn(),
      isMobile: false,
      openMobile: false,
      setOpenMobile: vi.fn(),
    };
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("renders all three top-level nav sections in expanded mode", () => {
    render(<AppSidebar />);
    expect(screen.getByText("AI Avatars")).toBeInTheDocument();
    expect(screen.getByText("Video Clips")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("expands a section when its parent button is clicked", () => {
    render(<AppSidebar />);
    // Sidebar auto-expands the section matching the current pathname, so AI
    // Avatars is open and clicking again collapses it.
    expect(screen.getByText("Scripts")).toBeInTheDocument();
    fireEvent.click(screen.getByText("AI Avatars"));
    expect(screen.queryByText("Scripts")).toBeNull();
    fireEvent.click(screen.getByText("AI Avatars"));
    expect(screen.getByText("Scripts")).toBeInTheDocument();
  });

  it("persists expanded items to localStorage", () => {
    render(<AppSidebar />);
    fireEvent.click(screen.getByText("Video Clips"));
    expect(localStorage.getItem("sidebar-expanded-items")).toContain(
      "video-clips",
    );
  });

  it("restores expanded items from localStorage on mount", () => {
    localStorage.setItem(
      "sidebar-expanded-items",
      JSON.stringify(["video-clips"]),
    );
    render(<AppSidebar />);
    expect(screen.getByText("My Video Clips")).toBeInTheDocument();
  });

  it("renders the collapsed shell when sidebar state is collapsed", () => {
    mockedSidebar.state = "collapsed";
    render(<AppSidebar />);
    // Collapsed mode hides the parent label but keeps the icon button.
    expect(screen.queryByText("AI Avatars")).toBeNull();
  });

  it("uses the mobile sheet when isMobile is true", () => {
    mockedSidebar.isMobile = true;
    mockedSidebar.openMobile = true;
    render(<AppSidebar />);
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("toggles the desktop sidebar when the collapse handle is clicked", () => {
    render(<AppSidebar />);
    // The collapse handle is the last unlabelled button.
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons.find((b) => b.querySelector("svg")) ?? buttons[0]);
    expect(mockedSidebar.toggleSidebar).toHaveBeenCalled();
  });

  it("treats / as the same active route as /ai-avatar/generate", () => {
    mockedPathname = "/";
    render(<AppSidebar />);
    expect(screen.getByText("AI Avatars")).toBeInTheDocument();
  });
});
