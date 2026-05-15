import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const listHeygenPrivateVideoResourcesMock = vi.fn();
const getHeygenVideoStatusMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  getHeygenVideoStatus: (...a: unknown[]) => getHeygenVideoStatusMock(...a),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  listHeygenPrivateVideoResources: (...a: unknown[]) =>
    listHeygenPrivateVideoResourcesMock(...a),
  getCurrentUsername: () => "alice",
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
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
vi.mock("@iblai/iblai-js/web-containers", () => ({
  Loader: () => <div data-testid="loader" />,
}));

import MyVideoClipsPage from "@/app/videos/my/page";

describe("MyVideoClipsPage", () => {
  beforeEach(() => {
    listHeygenPrivateVideoResourcesMock.mockReset();
    getHeygenVideoStatusMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the loader, then the generate-video tile when there are no videos yet", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([]);
    render(<MyVideoClipsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Generate Video Clip/i)).toBeInTheDocument(),
    );
  });

  it("renders an existing video from the catalog", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([
      {
        item_id: "r1",
        id: 1,
        name: "Hello clip",
        url: "",
        resource_type: "heygen_private_video",
        data: { id: "v1" },
        image: "",
        description: "",
      },
    ]);
    getHeygenVideoStatusMock.mockResolvedValue({
      id: "v1",
      title: "Hello clip",
      status: "completed",
      video_url: "https://x/v.mp4",
      thumbnail_url: "https://x/thumb.png",
      duration: 12,
      created_at: 1700000000,
    });
    render(<MyVideoClipsPage />);
    await waitFor(() =>
      expect(screen.getByText("Hello clip")).toBeInTheDocument(),
    );
  });

  it("surfaces an error message when the catalog list throws", async () => {
    listHeygenPrivateVideoResourcesMock.mockRejectedValueOnce(
      new Error("boom"),
    );
    render(<MyVideoClipsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load videos/i)).toBeInTheDocument(),
    );
  });

  it("renders the heading and intro copy", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([]);
    render(<MyVideoClipsPage />);
    expect(
      screen.getByRole("heading", { name: /my video clips/i }),
    ).toBeInTheDocument();
  });
});
