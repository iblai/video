import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const listHeygenVideosPageMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  listHeygenVideosPage: (...a: unknown[]) => listHeygenVideosPageMock(...a),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "main",
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("@/components/modals/video-player-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="video-player-modal" />,
}));

import CommunityPage from "@/app/community/page";

describe("CommunityPage", () => {
  beforeEach(() => {
    listHeygenVideosPageMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the heading + search input", async () => {
    listHeygenVideosPageMock.mockResolvedValue({
      data: [],
      has_more: false,
      next_token: null,
    });
    render(<CommunityPage />);
    expect(
      screen.getByRole("heading", { name: /community/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by title/i)).toBeInTheDocument();
  });

  it("renders an empty-state message when no videos come back", async () => {
    listHeygenVideosPageMock.mockResolvedValue({
      data: [],
      has_more: false,
      next_token: null,
    });
    render(<CommunityPage />);
    await waitFor(() =>
      expect(screen.getByText(/no videos yet/i)).toBeInTheDocument(),
    );
  });

  it("renders the video grid when results come back", async () => {
    listHeygenVideosPageMock.mockResolvedValue({
      data: [
        {
          id: "v1",
          title: "Hello",
          status: "completed",
          video_url: "https://x/v.mp4",
          thumbnail_url: "https://x/thumb.png",
          duration: 12,
          created_at: 1700000000,
        },
      ],
      has_more: false,
      next_token: null,
    });
    render(<CommunityPage />);
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
  });

  it("falls back to an error empty state when the upstream throws", async () => {
    listHeygenVideosPageMock.mockRejectedValueOnce(new Error("network"));
    render(<CommunityPage />);
    await waitFor(() =>
      expect(screen.getByText(/no videos/i)).toBeInTheDocument(),
    );
  });

  it("debounces and re-issues the list request when the search input changes", async () => {
    listHeygenVideosPageMock.mockResolvedValue({
      data: [],
      has_more: false,
      next_token: null,
    });
    render(<CommunityPage />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "abc" },
    });
    // Debounce window is 400ms; wait for the second fetch.
    await waitFor(
      () => expect(listHeygenVideosPageMock).toHaveBeenCalledTimes(2),
      { timeout: 2000 },
    );
  });
});
