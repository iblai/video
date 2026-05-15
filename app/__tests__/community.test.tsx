import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const listHeygenPrivateVideoResourcesMock = vi.fn();

vi.mock("@/lib/iblai/catalog", () => ({
  listHeygenPrivateVideoResources: (...a: unknown[]) =>
    listHeygenPrivateVideoResourcesMock(...a),
  PUBLIC_VIDEO_TENANT: "main",
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

function publicResource(id: string, title: string) {
  return {
    item_id: `r-${id}`,
    id: Number(id.replace(/\D/g, "")) || 1,
    name: title,
    data: {
      id,
      title,
      visibility: "public" as const,
      video_url: `https://example.com/${id}.mp4`,
      image_url: `https://example.com/${id}.png`,
      duration: 12,
      created_at: 1700000000,
    },
    resource_type: "heygen_private_video",
    image: "",
    url: "",
    description: "",
  };
}

describe("CommunityPage", () => {
  beforeEach(() => {
    listHeygenPrivateVideoResourcesMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queries the main tenant only", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([]);
    render(<CommunityPage />);
    await waitFor(() =>
      expect(listHeygenPrivateVideoResourcesMock).toHaveBeenCalledTimes(1),
    );
    expect(listHeygenPrivateVideoResourcesMock).toHaveBeenCalledWith("main");
  });

  it("renders the heading + search input", () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([]);
    render(<CommunityPage />);
    expect(
      screen.getByRole("heading", { name: /community/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by title/i)).toBeInTheDocument();
  });

  it("renders the empty-state when no public videos exist", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([]);
    render(<CommunityPage />);
    await waitFor(() =>
      expect(screen.getByText(/no public videos yet/i)).toBeInTheDocument(),
    );
  });

  it("renders public video copies straight from the main-tenant catalog", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([
      publicResource("v1", "Hello"),
      publicResource("v2", "Goodbye"),
    ]);
    render(<CommunityPage />);
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Goodbye")).toBeInTheDocument();
    });
  });

  it("drops resources marked anything other than public", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([
      publicResource("v1", "Public one"),
      {
        ...publicResource("v2", "Platform"),
        data: { ...publicResource("v2", "Platform").data, visibility: "platform" },
      },
      {
        ...publicResource("v3", "Personal"),
        data: { ...publicResource("v3", "Personal").data, visibility: "personal" },
      },
    ]);
    render(<CommunityPage />);
    await waitFor(() => expect(screen.getByText("Public one")).toBeInTheDocument());
    expect(screen.queryByText("Platform")).not.toBeInTheDocument();
    expect(screen.queryByText("Personal")).not.toBeInTheDocument();
  });

  it("drops public resources without an embedded video_url", async () => {
    const broken = publicResource("v1", "Half-baked");
    broken.data.video_url = "";
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([broken]);
    render(<CommunityPage />);
    await waitFor(() =>
      expect(screen.getByText(/no public videos yet/i)).toBeInTheDocument(),
    );
  });

  it("filters the grid by the debounced search input", async () => {
    listHeygenPrivateVideoResourcesMock.mockResolvedValue([
      publicResource("welcome", "Welcome"),
      publicResource("goodbye", "Goodbye"),
    ]);
    render(<CommunityPage />);
    await waitFor(() => expect(screen.getByText("Welcome")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "good" },
    });
    await waitFor(
      () =>
        expect(screen.queryByText("Welcome")).not.toBeInTheDocument() &&
        expect(screen.getByText("Goodbye")).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("falls back to an empty state when the upstream throws", async () => {
    listHeygenPrivateVideoResourcesMock.mockRejectedValueOnce(
      new Error("network"),
    );
    render(<CommunityPage />);
    await waitFor(() =>
      expect(screen.getByText(/no public videos yet/i)).toBeInTheDocument(),
    );
  });
});
