import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const listVideoPromptResourcesMock = vi.fn();
const createVideoPromptResourceMock = vi.fn();
const deleteCatalogResourceMock = vi.fn();
const useHeygenAvatarsMock = vi.fn();

vi.mock("@/lib/iblai/catalog", () => ({
  listVideoPromptResources: (...a: unknown[]) => listVideoPromptResourcesMock(...a),
  createVideoPromptResource: (...a: unknown[]) => createVideoPromptResourceMock(...a),
  deleteCatalogResource: (...a: unknown[]) => deleteCatalogResourceMock(...a),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("@/components/modals/prompt-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="prompt-modal" />,
}));
vi.mock("@/components/modals/video-player-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="video-player-modal" />,
}));
vi.mock("@/components/modals/create-avatar-video-modal", () => ({
  CreateAvatarVideoModal: () => <div data-testid="create-video-modal" />,
}));
vi.mock("@/components/modals/character-selection-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="character-selection-modal" />,
}));
vi.mock("@/hooks/use-heygen-avatars", () => ({
  useHeygenAvatars: () => useHeygenAvatarsMock(),
}));
vi.mock("@iblai/iblai-js/web-containers", () => ({
  Loader: () => <div data-testid="loader" />,
}));

import PromptsPage from "@/app/videos/prompts/page";
import PublicVideoClipsPage from "@/app/videos/public-video-clips/page";
import MyAvatarsPage from "@/app/ai-avatar/my/page";

describe("PromptsPage", () => {
  beforeEach(() => {
    listVideoPromptResourcesMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the heading and category tabs", async () => {
    listVideoPromptResourcesMock.mockResolvedValue([]);
    render(<PromptsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /prompt gallery/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/All/i).length).toBeGreaterThan(0);
  });

  it("renders prompts loaded from the catalog", async () => {
    listVideoPromptResourcesMock.mockResolvedValue([
      {
        id: 1,
        item_id: "p1",
        name: "Sample",
        data: { title: "Sample", category: "AI TAs", description: "body" },
        resource_type: "video_prompt",
        image: "",
        url: "",
        description: "body",
      },
    ]);
    render(<PromptsPage />);
    await waitFor(() =>
      expect(screen.getAllByText("Sample").length).toBeGreaterThan(0),
    );
  });

  it("renders gracefully when the catalog throws", async () => {
    listVideoPromptResourcesMock.mockRejectedValueOnce(new Error("nope"));
    render(<PromptsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /prompt gallery/i }),
      ).toBeInTheDocument(),
    );
  });
});

describe("PublicVideoClipsPage", () => {
  it("renders the static gallery shell", () => {
    render(<PublicVideoClipsPage />);
    expect(
      screen.getAllByText(/business ethics/i).length,
    ).toBeGreaterThan(0);
  });
});

describe("MyAvatarsPage", () => {
  beforeEach(() => {
    useHeygenAvatarsMock.mockReset();
    useHeygenAvatarsMock.mockReturnValue({
      avatars: [],
      loading: false,
      error: null,
      refetchGroup: vi.fn(),
    });
  });

  it("renders the page heading once data resolves", async () => {
    render(<MyAvatarsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /my ai avatars/i }),
      ).toBeInTheDocument(),
    );
  });

  it("mounts even while the hook is still loading", () => {
    useHeygenAvatarsMock.mockReturnValue({
      avatars: [],
      loading: true,
      error: null,
      refetchGroup: vi.fn(),
    });
    const { container } = render(<MyAvatarsPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("mounts even when the hook returns an error", () => {
    useHeygenAvatarsMock.mockReturnValue({
      avatars: [],
      loading: false,
      error: "boom",
      refetchGroup: vi.fn(),
    });
    const { container } = render(<MyAvatarsPage />);
    expect(container.firstChild).not.toBeNull();
  });
});
