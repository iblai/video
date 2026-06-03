import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const uploadHeygenAssetMock = vi.fn();
const createHeygenVideoClipMock = vi.fn();
const ensureUnsignedImageUrlMock = vi.fn();
const listHeygenVoicesPageMock = vi.fn();
const createHeygenPrivateVideoResourceMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  uploadHeygenAsset: (...a: unknown[]) => uploadHeygenAssetMock(...a),
  createHeygenVideoClip: (...a: unknown[]) => createHeygenVideoClipMock(...a),
  ensureUnsignedImageUrl: (...a: unknown[]) => ensureUnsignedImageUrlMock(...a),
  listHeygenVoicesPage: (...a: unknown[]) => listHeygenVoicesPageMock(...a),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  createHeygenPrivateVideoResource: (...a: unknown[]) =>
    createHeygenPrivateVideoResourceMock(...a),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));
vi.mock("@/lib/openai/proxy", () => ({
  openaiProxyUrl: (path: string) => `/api/openai/${path}`,
  openaiProxyAuthHeaders: () => ({
    Authorization: "Token x",
    "X-Platform": "acme",
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("@/components/modals/choose-voice-modal", () => ({
  ChooseVoiceModal: () => <div data-testid="choose-voice" />,
}));

import { VideoGenerator } from "@/components/video-generator";

describe("VideoGenerator", () => {
  beforeEach(() => {
    uploadHeygenAssetMock.mockReset();
    createHeygenVideoClipMock.mockReset();
    ensureUnsignedImageUrlMock.mockReset();
    listHeygenVoicesPageMock.mockReset().mockResolvedValue({
      data: [],
      has_more: false,
      next_token: null,
    });
    createHeygenPrivateVideoResourceMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the generator header and upload zone", () => {
    render(<VideoGenerator />);
    expect(
      screen.getByRole("heading", { name: /generate video clip/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/upload reference image/i)).toBeInTheDocument();
  });

  it("renders the script + motion prompt inputs", () => {
    render(<VideoGenerator />);
    expect(
      screen.getByPlaceholderText(/what should the avatar say/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/describe the motion or scene/i),
    ).toBeInTheDocument();
  });

  it("renders the model selector with HeyGen visible", () => {
    render(<VideoGenerator />);
    expect(screen.getAllByText(/HeyGen/i).length).toBeGreaterThan(0);
  });

  it("opens the URL paste input when the URL button is clicked", () => {
    render(<VideoGenerator />);
    // Find the "URL" button used to toggle URL input mode.
    const urlButton = screen
      .getAllByRole("button")
      .find((b) => /url/i.test(b.textContent ?? ""));
    if (urlButton) {
      fireEvent.click(urlButton);
      expect(
        screen.getByPlaceholderText(/enter image url/i),
      ).toBeInTheDocument();
    }
  });
});
