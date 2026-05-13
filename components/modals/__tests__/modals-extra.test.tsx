import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@iblai/iblai-js/web-containers", () => ({
  Loader: () => <div data-testid="loader" />,
}));
vi.mock("@/hooks/use-heygen-voices", () => ({
  useHeygenVoices: () => ({
    voices: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/lib/heygen/rest", () => ({
  listHeygenInteractiveAvatars: vi.fn(async () => []),
}));

import { ChooseVoiceModal } from "@/components/modals/choose-voice-modal";
import { DesignAIModal } from "@/components/modals/design-ai-modal";
import CharacterSelectionModal from "@/components/modals/character-selection-modal";

describe("ChooseVoiceModal", () => {
  it("renders nothing when closed", () => {
    render(
      <ChooseVoiceModal
        open={false}
        onOpenChange={() => {}}
        onSelectVoice={() => {}}
      />,
    );
    expect(screen.queryByText(/voice/i)).toBeNull();
  });

  it("renders the search input when open", () => {
    render(
      <ChooseVoiceModal
        open
        onOpenChange={() => {}}
        onSelectVoice={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

describe("DesignAIModal", () => {
  it("renders nothing when closed", () => {
    render(
      <DesignAIModal
        open={false}
        onOpenChange={() => {}}
        onGeneratePreview={() => {}}
      />,
    );
    expect(screen.queryByText(/design/i)).toBeNull();
  });

  it("renders the form when open and surfaces input fields", () => {
    const onGen = vi.fn();
    render(
      <DesignAIModal
        open
        onOpenChange={() => {}}
        onGeneratePreview={onGen}
      />,
    );
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });
});

describe("CharacterSelectionModal", () => {
  it("renders nothing when no character is selected", () => {
    const { container } = render(
      <CharacterSelectionModal
        isOpen
        onClose={() => {}}
        character={null}
        onCreateVideo={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the character name and create-video action", () => {
    const onCreate = vi.fn();
    render(
      <CharacterSelectionModal
        isOpen
        onClose={() => {}}
        character={{
          id: "char-1",
          name: "Alex",
          image: "https://x/img.png",
        }}
        onCreateVideo={onCreate}
      />,
    );
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0);
  });
});
