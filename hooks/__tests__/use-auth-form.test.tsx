import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const redirectMock = vi.fn();
vi.mock("@/lib/iblai/auth-utils", () => ({
  redirectToAuthSpa: (...args: unknown[]) => redirectMock(...args),
}));

import { useAuthForm } from "@/hooks/use-auth-form";

describe("useAuthForm", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });
  afterEach(() => {
    redirectMock.mockReset();
  });

  it("starts with empty fields and form flags off", () => {
    const { result } = renderHook(() => useAuthForm());
    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.emailError).toBe("");
    expect(result.current.showPassword).toBe(false);
    expect(result.current.showPasswordForm).toBe(false);
    expect(result.current.showConfirmation).toBe(false);
  });

  it("exposes setters that update state", () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => {
      result.current.setEmail("a@b.com");
      result.current.setPassword("p");
      result.current.setEmailError("bad");
    });
    expect(result.current.email).toBe("a@b.com");
    expect(result.current.password).toBe("p");
    expect(result.current.emailError).toBe("bad");
  });

  it("handleContinue redirects to the auth SPA", () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.handleContinue());
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("handlePasswordContinue redirects to the auth SPA", () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.handlePasswordContinue());
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("handlePasswordLogin opens the password form", () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.handlePasswordLogin());
    expect(result.current.showPasswordForm).toBe(true);
  });

  it("handleBackToMain hides the password form and clears the password", () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => {
      result.current.handlePasswordLogin();
      result.current.setPassword("secret");
    });
    expect(result.current.password).toBe("secret");
    act(() => result.current.handleBackToMain());
    expect(result.current.showPasswordForm).toBe(false);
    expect(result.current.password).toBe("");
  });

  it("togglePasswordVisibility flips the showPassword flag", () => {
    const { result } = renderHook(() => useAuthForm());
    expect(result.current.showPassword).toBe(false);
    act(() => result.current.togglePasswordVisibility());
    expect(result.current.showPassword).toBe(true);
    act(() => result.current.togglePasswordVisibility());
    expect(result.current.showPassword).toBe(false);
  });
});
