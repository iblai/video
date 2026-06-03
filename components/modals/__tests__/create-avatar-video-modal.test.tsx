import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("@/lib/heygen/rest", () => ({
  createHeygenVideo: vi.fn(),
  resolveHeygenLookId: vi.fn(),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  createHeygenPrivateVideoResource: vi.fn(),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));
vi.mock("@/components/modals/choose-voice-modal", () => ({
  ChooseVoiceModal: () => <div data-testid="voice-modal" />,
}));
vi.mock("@/components/modals/record-audio-modal", () => ({
  RecordAudioModal: () => <div data-testid="record-modal" />,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { CreateAvatarVideoModal } from "@/components/modals/create-avatar-video-modal";

describe("CreateAvatarVideoModal", () => {
  it("renders nothing when closed", () => {
    render(
      <CreateAvatarVideoModal
        open={false}
        onOpenChange={() => {}}
        avatar={null}
      />,
    );
    expect(screen.queryByText(/script/i)).toBeNull();
  });

  it("renders the dialog with the avatar's image when open", () => {
    render(
      <CreateAvatarVideoModal
        open
        onOpenChange={() => {}}
        avatar={{
          id: "a1",
          name: "Aria",
          image: "https://x/img.png",
          default_voice_id: "v1",
        }}
      />,
    );
    // Radix Dialog renders into document.body via Portal.
    expect(document.body.querySelector('img[alt="Aria"]')).not.toBeNull();
  });
});
