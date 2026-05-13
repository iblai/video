import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ShareModal } from "@/components/modals/share-modal";

describe("ShareModal", () => {
  const writeText = vi.fn(async () => {});
  beforeEach(() => {
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    });
  });
  afterEach(() => {
    writeText.mockReset();
  });

  it("renders an unopened dialog without throwing", () => {
    render(
      <ShareModal
        open={false}
        onOpenChange={() => {}}
        agentId="agent-1"
        characterName="Aria"
      />,
    );
    expect(screen.queryByText(/Talk to avatar link/i)).toBeNull();
  });

  it("builds the share URL from the avatar id when present", () => {
    render(
      <ShareModal
        open
        onOpenChange={() => {}}
        agentId="agent-1"
        characterName="Aria"
        avatarId="avatar-42"
      />,
    );
    const input = screen.getByDisplayValue(
      /^https:\/\/ibl-vidai\.vercel\.app\/session\/avatar-42\//,
    );
    expect(input).toBeInTheDocument();
  });

  it("falls back to the agent id when no avatar id is given", () => {
    render(
      <ShareModal
        open
        onOpenChange={() => {}}
        agentId="agent-1"
        characterName="Aria"
      />,
    );
    expect(
      screen.getByDisplayValue("https://ibl-vidai.vercel.app/session/agent-1"),
    ).toBeInTheDocument();
  });

  it("Copy button writes the URL to the clipboard and flips the label", async () => {
    render(
      <ShareModal
        open
        onOpenChange={() => {}}
        agentId="agent-1"
        characterName="Aria"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument(),
    );
  });

  it("Copy failures are surfaced via console without crashing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValueOnce(new Error("boom"));
    render(
      <ShareModal
        open
        onOpenChange={() => {}}
        agentId="agent-1"
        characterName="Aria"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();
  });

  it("Done button closes the modal", () => {
    const onOpenChange = vi.fn();
    render(
      <ShareModal
        open
        onOpenChange={onOpenChange}
        agentId="agent-1"
        characterName="Aria"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
