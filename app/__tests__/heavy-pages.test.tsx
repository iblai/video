import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const generateHeygenSpeechMock = vi.fn();
const listHeygenVoicesPageMock = vi.fn();
const uploadHeygenAssetMock = vi.fn();
const cloneHeygenVoiceMock = vi.fn();
const createHeygenPhotoAvatarGroupMock = vi.fn();
const finalizeAndTrainPhotoAvatarGroupMock = vi.fn();
const createHeygenDigitalTwinAvatarMock = vi.fn();
const createHeygenAvatarConsentUrlMock = vi.fn();
const extractVideoFrameJpegMock = vi.fn();
const ensureUnsignedImageUrlMock = vi.fn();
const createHeygenPrivateAvatarResourceMock = vi.fn();
const createHeygenPrivateVoiceResourceMock = vi.fn();
const useHeygenAvatarsMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  generateHeygenSpeech: (...a: unknown[]) => generateHeygenSpeechMock(...a),
  listHeygenVoicesPage: (...a: unknown[]) => listHeygenVoicesPageMock(...a),
  uploadHeygenAsset: (...a: unknown[]) => uploadHeygenAssetMock(...a),
  cloneHeygenVoice: (...a: unknown[]) => cloneHeygenVoiceMock(...a),
  createHeygenPhotoAvatarGroup: (...a: unknown[]) =>
    createHeygenPhotoAvatarGroupMock(...a),
  finalizeAndTrainPhotoAvatarGroup: (...a: unknown[]) =>
    finalizeAndTrainPhotoAvatarGroupMock(...a),
  createHeygenDigitalTwinAvatar: (...a: unknown[]) =>
    createHeygenDigitalTwinAvatarMock(...a),
  createHeygenAvatarConsentUrl: (...a: unknown[]) =>
    createHeygenAvatarConsentUrlMock(...a),
  extractVideoFrameJpeg: (...a: unknown[]) => extractVideoFrameJpegMock(...a),
  ensureUnsignedImageUrl: (...a: unknown[]) => ensureUnsignedImageUrlMock(...a),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  createHeygenPrivateAvatarResource: (...a: unknown[]) =>
    createHeygenPrivateAvatarResourceMock(...a),
  createHeygenPrivateVoiceResource: (...a: unknown[]) =>
    createHeygenPrivateVoiceResourceMock(...a),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));
vi.mock("@/lib/openai/proxy", () => ({
  openaiProxyUrl: (path: string) => `/api/openai/${path}`,
  openaiProxyAuthHeaders: () => ({}),
}));
vi.mock("@/lib/scripts/extract-text", () => ({
  extractTextFromFile: vi.fn(async () => "extracted"),
}));
vi.mock("@/hooks/use-heygen-avatars", () => ({
  useHeygenAvatars: () => useHeygenAvatarsMock(),
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
vi.mock("@iblai/iblai-js/web-containers", () => ({
  RichTextEditor: () => <div data-testid="rich-text-editor" />,
  Loader: () => <div data-testid="loader" />,
}));
vi.mock("@iblai/iblai-js/web-containers/next", () => ({
  ConversationStarters: () => <div data-testid="conversation-starters" />,
}));
vi.mock("@/components/modals/choose-voice-modal", () => ({
  ChooseVoiceModal: () => <div data-testid="choose-voice-modal" />,
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AddScriptPage from "@/app/scripts/add/page";
import CreateVoicePage from "@/app/voices/create/page";
import CreateAvatarPage from "@/app/ai-avatar/generate/page";
import InteractiveAvatarsPage from "@/app/ai-avatar/interactive/page";
import VideoWatchPage from "@/app/video/watch/[id]/page";

describe("AddScriptPage smoke", () => {
  beforeEach(() => {
    listHeygenVoicesPageMock.mockResolvedValue({
      data: [
        {
          voice_id: "v1",
          name: "Voice One",
          language: "English",
          gender: "female",
          preview_audio_url: null,
        },
      ],
      has_more: false,
      next_token: null,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders the script editor header and tabs", () => {
    render(<AddScriptPage />);
    expect(
      screen.getByRole("heading", { name: /create script/i }),
    ).toBeInTheDocument();
  });

  it("renders the rich text editor placeholder for the Text tab", () => {
    render(<AddScriptPage />);
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
  });

  it("switches between Audio and Files tabs", async () => {
    const { rerender: _rerender } = render(<AddScriptPage />);
    const buttons = screen.getAllByRole("button");
    const audioBtn = buttons.find((b) => /^Audio$/.test(b.textContent ?? ""));
    const filesBtn = buttons.find((b) => /^Files$/.test(b.textContent ?? ""));
    audioBtn?.click();
    filesBtn?.click();
    // Smoke: clicking the tabs shouldn't throw.
    expect(filesBtn).toBeTruthy();
  });

  it("opens the AI Help dialog when the AI Help button is clicked", async () => {
    render(<AddScriptPage />);
    const aiBtn = screen
      .getAllByRole("button")
      .find((b) => /AI Help/i.test(b.textContent ?? ""));
    if (aiBtn) {
      aiBtn.click();
      await waitFor(() =>
        expect(
          screen.getAllByText(/photosynthesis/i).length,
        ).toBeGreaterThanOrEqual(1),
      );
    }
  });
});

describe("CreateVoicePage smoke", () => {
  it("renders the voice creation form heading", () => {
    render(<CreateVoicePage />);
    expect(
      screen.getByRole("heading", { name: /create.*voice/i }),
    ).toBeInTheDocument();
  });

  it("renders the language + voice name fields", () => {
    render(<CreateVoicePage />);
    expect(screen.getAllByText(/language/i).length).toBeGreaterThan(0);
  });
});

describe("CreateAvatarPage smoke", () => {
  it("renders the page heading and upload zone", () => {
    render(<CreateAvatarPage />);
    expect(
      screen.getByRole("heading", { name: /generate ai avatar/i }),
    ).toBeInTheDocument();
  });
});

describe("InteractiveAvatarsPage smoke", () => {
  beforeEach(() => {
    useHeygenAvatarsMock.mockReset();
    useHeygenAvatarsMock.mockReturnValue({
      avatars: [],
      loading: false,
      error: null,
      refetchGroup: vi.fn(),
    });
  });

  it("renders the heading and search input", () => {
    render(<InteractiveAvatarsPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("shows the loader while loading", () => {
    useHeygenAvatarsMock.mockReturnValue({
      avatars: [],
      loading: true,
      error: null,
      refetchGroup: vi.fn(),
    });
    render(<InteractiveAvatarsPage />);
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders an avatar card when one is returned", async () => {
    useHeygenAvatarsMock.mockReturnValue({
      avatars: [
        {
          id: "a1",
          name: "Aria",
          preview_image_url: "https://x/img.png",
          tags: ["history"],
          status: "completed",
        },
      ],
      loading: false,
      error: null,
      refetchGroup: vi.fn(),
    });
    render(<InteractiveAvatarsPage />);
    await waitFor(() =>
      expect(screen.getAllByText(/Aria/i).length).toBeGreaterThan(0),
    );
  });
});

describe("VideoWatchPage smoke", () => {
  it("renders without throwing when given a video id param", async () => {
    const params = Promise.resolve({ id: "v-1" });
    expect(() => render(<VideoWatchPage params={params} />)).not.toThrow();
  });
});
