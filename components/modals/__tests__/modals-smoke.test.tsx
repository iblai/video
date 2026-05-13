import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src as string} />
  ),
}));

import { CreateAvatarModal } from "@/components/modals/create-avatar-modal";
import PromptModal from "@/components/modals/prompt-modal";
import VideoPlayerModal from "@/components/modals/video-player-modal";
import { RecordAudioModal } from "@/components/modals/record-audio-modal";
import { UploadPhotoModal } from "@/components/modals/upload-photo-modal";

describe("CreateAvatarModal", () => {
  it("returns null content when closed", () => {
    render(
      <CreateAvatarModal
        open={false}
        onOpenChange={() => {}}
        onSelectVideo={() => {}}
        onSelectPhoto={() => {}}
        onDesignWithAI={() => {}}
      />,
    );
    expect(screen.queryByText(/Create Your AI Avatar/i)).toBeNull();
  });

  it("renders the dialog and wires the photo + design AI buttons when open", () => {
    const onSelectPhoto = vi.fn();
    const onDesignWithAI = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CreateAvatarModal
        open
        onOpenChange={onOpenChange}
        onSelectVideo={() => {}}
        onSelectPhoto={onSelectPhoto}
        onDesignWithAI={onDesignWithAI}
      />,
    );
    expect(screen.getAllByText(/Create Your AI Avatar/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /upload photo/i }));
    expect(onSelectPhoto).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /design with ai/i }));
    expect(onDesignWithAI).toHaveBeenCalled();
  });
});

describe("PromptModal", () => {
  it("renders Add New Prompt title in create mode", () => {
    render(
      <PromptModal
        isOpen
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByText(/Add New Prompt/i)).toBeInTheDocument();
  });

  it("renders the prompt fields populated when editing", () => {
    render(
      <PromptModal
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        editPrompt={{
          id: 1,
          title: "Existing",
          category: "Students",
          description: "Body text",
        }}
      />,
    );
    expect(screen.getByText(/Edit Prompt/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Body text")).toBeInTheDocument();
  });

  it("returns null content when closed", () => {
    render(
      <PromptModal
        isOpen={false}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByText(/Add New Prompt/i)).toBeNull();
  });
});

describe("VideoPlayerModal", () => {
  it("renders nothing when video is null", () => {
    const { container } = render(
      <VideoPlayerModal isOpen onClose={() => {}} video={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the video metadata when given a video", () => {
    render(
      <VideoPlayerModal
        isOpen
        onClose={() => {}}
        video={{
          id: "v1",
          title: "My Video",
          thumbnail: "https://x/thumb.png",
          videoUrl: "https://x/v.mp4",
          duration: "1:23",
          createdAt: "2025-01-01",
        }}
      />,
    );
    expect(screen.getByText("My Video")).toBeInTheDocument();
  });
});

describe("RecordAudioModal", () => {
  it("returns null content when closed", () => {
    render(
      <RecordAudioModal
        open={false}
        onOpenChange={() => {}}
        onRecordComplete={() => {}}
      />,
    );
    expect(screen.queryByText(/Record/i)).toBeNull();
  });

  it("renders the recording UI when open", () => {
    render(
      <RecordAudioModal
        open
        onOpenChange={() => {}}
        onRecordComplete={() => {}}
      />,
    );
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

describe("UploadPhotoModal", () => {
  it("returns null content when closed", () => {
    render(
      <UploadPhotoModal
        open={false}
        onOpenChange={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(screen.queryByText(/Upload/i)).toBeNull();
  });

  it("renders the upload UI when open", () => {
    render(
      <UploadPhotoModal
        open
        onOpenChange={() => {}}
        onUpload={() => {}}
      />,
    );
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
