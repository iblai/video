import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const createMock = vi.fn();
const startMock = vi.fn();
const stopMock = vi.fn();
const taskMock = vi.fn();
const interruptMock = vi.fn();
const keepAliveMock = vi.fn();
const startListenMock = vi.fn();
const stopListenMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  createHeygenStreamingSession: (...a: unknown[]) => createMock(...a),
  startHeygenStreamingSession: (...a: unknown[]) => startMock(...a),
  stopHeygenStreamingSession: (...a: unknown[]) => stopMock(...a),
  sendHeygenStreamingTask: (...a: unknown[]) => taskMock(...a),
  interruptHeygenStreamingSession: (...a: unknown[]) => interruptMock(...a),
  keepAliveHeygenStreamingSession: (...a: unknown[]) => keepAliveMock(...a),
  startHeygenStreamingListening: (...a: unknown[]) => startListenMock(...a),
  stopHeygenStreamingListening: (...a: unknown[]) => stopListenMock(...a),
}));

interface FakeRoomCtor {
  new (...args: unknown[]): FakeRoom;
}

interface FakeRoom {
  __handlers: Record<string, ((...args: unknown[]) => void)[]>;
  on: (event: string, cb: (...args: unknown[]) => void) => FakeRoom;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  localParticipant: {
    setMicrophoneEnabled: ReturnType<typeof vi.fn>;
  };
}

const roomInstances: FakeRoom[] = [];

function makeRoom(): FakeRoom {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const room: FakeRoom = {
    __handlers: handlers,
    on(event, cb) {
      (handlers[event] ??= []).push(cb);
      return room;
    },
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    localParticipant: {
      setMicrophoneEnabled: vi.fn(async () => {}),
    },
  };
  return room;
}

vi.mock("livekit-client", () => ({
  Room: function (this: unknown) {
    const room = makeRoom();
    roomInstances.push(room);
    return room;
  } as unknown as FakeRoomCtor,
  RoomEvent: {
    TrackSubscribed: "TrackSubscribed",
    Disconnected: "Disconnected",
    ConnectionStateChanged: "ConnectionStateChanged",
    ParticipantConnected: "ParticipantConnected",
    ParticipantDisconnected: "ParticipantDisconnected",
    TrackPublished: "TrackPublished",
    ActiveSpeakersChanged: "ActiveSpeakersChanged",
    DataReceived: "DataReceived",
  },
}));

const originalWebSocket = window.WebSocket;
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  addEventListener(event: string, cb: (e: unknown) => void) {
    (this.listeners[event] ??= []).push(cb);
  }
  close() {
    this.closed = true;
  }
}

import { useHeygenStreaming } from "@/hooks/use-heygen-streaming";

const session = {
  session_id: "sess-1",
  access_token: "tok",
  url: "wss://room",
};

describe("useHeygenStreaming", () => {
  beforeEach(() => {
    roomInstances.length = 0;
    FakeWebSocket.instances = [];
    window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    createMock.mockReset().mockResolvedValue(session);
    startMock.mockReset().mockResolvedValue(undefined);
    stopMock.mockReset().mockResolvedValue(undefined);
    taskMock.mockReset().mockResolvedValue(undefined);
    interruptMock.mockReset().mockResolvedValue(undefined);
    keepAliveMock.mockReset().mockResolvedValue(undefined);
    startListenMock.mockReset().mockResolvedValue(undefined);
    stopListenMock.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    window.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  it("stays idle when input is null", async () => {
    const { result } = renderHook(() => useHeygenStreaming(null));
    expect(result.current.state).toBe("idle");
  });

  it("creates a session and reaches connected state", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({
        avatar_name: "a1",
        quality: "medium",
        voice: { voice_id: "v" },
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    expect(createMock).toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledWith("sess-1");
    expect(roomInstances[0].connect).toHaveBeenCalledWith("wss://room", "tok");
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("attaches a queued video track when attachVideo is called", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    const track = { attach: vi.fn(), kind: "video" };
    act(() => {
      roomInstances[0].__handlers.TrackSubscribed[0](track, {}, {});
    });
    const video = document.createElement("video");
    act(() => result.current.attachVideo(video));
    expect(track.attach).toHaveBeenCalledWith(video);
  });

  it("attaches a subscribed audio track to a fresh audio element", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    const track = { attach: vi.fn(), kind: "audio" };
    act(() => {
      roomInstances[0].__handlers.TrackSubscribed[0](track, {}, {});
    });
    expect(track.attach).toHaveBeenCalled();
  });

  it("sendTask transitions to speaking then back to connected", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    await act(async () => {
      await result.current.sendTask("hello", { type: "repeat" });
    });
    expect(taskMock).toHaveBeenCalledWith({
      session_id: "sess-1",
      text: "hello",
      task_type: "repeat",
    });
    expect(result.current.state).toBe("connected");
  });

  it("sendTask throws when called before a session exists", async () => {
    const { result } = renderHook(() => useHeygenStreaming(null));
    await expect(result.current.sendTask("hi")).rejects.toThrow(
      /no active session/,
    );
  });

  it("startVoiceChat enables the mic and starts listening", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    await act(async () => {
      await result.current.startVoiceChat();
    });
    expect(
      roomInstances[0].localParticipant.setMicrophoneEnabled,
    ).toHaveBeenCalledWith(true);
    expect(startListenMock).toHaveBeenCalledWith("sess-1");
    expect(result.current.micOn).toBe(true);
  });

  it("startVoiceChat rolls back the mic when start_listening fails", async () => {
    startListenMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    await expect(result.current.startVoiceChat()).rejects.toThrow(/boom/);
    expect(
      roomInstances[0].localParticipant.setMicrophoneEnabled,
    ).toHaveBeenLastCalledWith(false);
  });

  it("stopVoiceChat disables the mic and stops listening", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    await act(async () => {
      await result.current.startVoiceChat();
    });
    await act(async () => {
      await result.current.stopVoiceChat();
    });
    expect(stopListenMock).toHaveBeenCalledWith("sess-1");
    expect(result.current.micOn).toBe(false);
  });

  it("interrupt forwards to the streaming API", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    await act(async () => {
      await result.current.interrupt();
    });
    expect(interruptMock).toHaveBeenCalledWith("sess-1");
  });

  it("interrupt no-ops when there is no session", async () => {
    const { result } = renderHook(() => useHeygenStreaming(null));
    await act(async () => {
      await result.current.interrupt();
    });
    expect(interruptMock).not.toHaveBeenCalled();
  });

  it("stop tears the session down", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    await act(async () => {
      await result.current.stop();
    });
    expect(stopMock).toHaveBeenCalledWith("sess-1");
    expect(result.current.state).toBe("ended");
  });

  it("transitions to error state when createHeygenStreamingSession fails", async () => {
    createMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.error).toBe("boom");
  });

  it("RoomEvent.Disconnected moves the state to ended", async () => {
    const { result } = renderHook(() =>
      useHeygenStreaming({ avatar_name: "a" }),
    );
    await waitFor(() => expect(result.current.state).toBe("connected"));
    act(() => {
      roomInstances[0].__handlers.Disconnected[0]("client-initiated");
    });
    expect(result.current.state).toBe("ended");
  });
});
