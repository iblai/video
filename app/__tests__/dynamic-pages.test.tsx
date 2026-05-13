import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";

const useHeygenStreamingMock = vi.fn();
const listHeygenInteractiveAvatarsMock = vi.fn();
const listHeygenKnowledgeBasesMock = vi.fn();
const getHeygenAvatarGroupMock = vi.fn();
const listHeygenPrivateAvatarResourcesMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  listHeygenInteractiveAvatars: (...a: unknown[]) =>
    listHeygenInteractiveAvatarsMock(...a),
  listHeygenKnowledgeBases: (...a: unknown[]) =>
    listHeygenKnowledgeBasesMock(...a),
  getHeygenAvatarGroup: (...a: unknown[]) => getHeygenAvatarGroupMock(...a),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  listHeygenPrivateAvatarResources: (...a: unknown[]) =>
    listHeygenPrivateAvatarResourcesMock(...a),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));
vi.mock("@/hooks/use-heygen-streaming", () => ({
  useHeygenStreaming: (...a: unknown[]) => useHeygenStreamingMock(...a),
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
vi.mock("@/components/modals/choose-voice-modal", () => ({
  ChooseVoiceModal: () => <div data-testid="choose-voice-modal" />,
}));
vi.mock("@/components/modals/share-modal", () => ({
  ShareModal: () => <div data-testid="share-modal" />,
}));

import { Suspense } from "react";
import InteractiveAvatarPage from "@/app/ai-avatar/interactive/[id]/page";
import SessionPage from "@/app/session/[avatar]/[sessionId]/page";

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<span>loading</span>}>{node}</Suspense>;
}

describe("InteractiveAvatarPage smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([]);
    getHeygenAvatarGroupMock.mockResolvedValue({});
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders without throwing for a given avatar id", async () => {
    const params = Promise.resolve({ id: "a1" });
    expect(() => render(<InteractiveAvatarPage params={params} />)).not.toThrow();
    // Allow the use() promise to resolve.
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });
});

describe("SessionPage smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    useHeygenStreamingMock.mockReturnValue({
      state: "idle",
      error: null,
      attachVideo: vi.fn(),
      sendTask: vi.fn(),
      interrupt: vi.fn(),
      stop: vi.fn(),
      micOn: false,
      startVoiceChat: vi.fn(),
      stopVoiceChat: vi.fn(),
    });
    listHeygenInteractiveAvatarsMock.mockResolvedValue([]);
    listHeygenKnowledgeBasesMock.mockResolvedValue([]);
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the configured character image", async () => {
    const params = Promise.resolve({
      avatar: "marcus-aurelius",
      sessionId: "sess-1",
    });
    render(withSuspense(<SessionPage params={params} />));
    await waitFor(() =>
      expect(
        screen.queryAllByAltText(/Marcus Aurelius/i).length,
      ).toBeGreaterThanOrEqual(0),
    );
  });

  it("falls back to a generic avatar for unknown ids", async () => {
    const params = Promise.resolve({ avatar: "unknown", sessionId: "s1" });
    expect(() =>
      render(withSuspense(<SessionPage params={params} />)),
    ).not.toThrow();
  });

  it("renders without throwing in error state", async () => {
    useHeygenStreamingMock.mockReturnValue({
      state: "error",
      error: "boom",
      attachVideo: vi.fn(),
      sendTask: vi.fn(),
      interrupt: vi.fn(),
      stop: vi.fn(),
      micOn: false,
      startVoiceChat: vi.fn(),
      stopVoiceChat: vi.fn(),
    });
    const params = Promise.resolve({ avatar: "marie-curie", sessionId: "s1" });
    expect(() =>
      render(withSuspense(<SessionPage params={params} />)),
    ).not.toThrow();
  });
});
