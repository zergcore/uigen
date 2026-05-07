// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockCookieStore = { set: mockSet, get: mockGet };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    mockSet.mockClear();
    mockGet.mockClear();
  });

  test("sets a cookie with the correct name", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    expect(mockSet.mock.calls[0][0]).toBe("auth-token");
  });

  test("sets a cookie with correct security options", async () => {
    await createSession("user-1", "test@example.com");

    const options = mockSet.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.secure).toBe(false); // NODE_ENV is 'test', not 'production'
  });

  test("sets a cookie expiring approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const expires: Date = mockSet.mock.calls[0][2].expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("sets a cookie whose value is a valid JWT containing userId and email", async () => {
    await createSession("user-42", "hello@example.com");

    const token: string = mockSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("JWT expires after 7 days", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const token: string = mockSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysS = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(Math.floor(before / 1000) + sevenDaysS - 5);
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(after / 1000) + sevenDaysS + 5);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  test("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when the token is invalid", async () => {
    mockGet.mockReturnValue({ value: "not-a-valid-jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when the token is signed with a different secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-1", email: "test@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);
    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await new SignJWT({ userId: "user-99", email: "valid@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);
    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("valid@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await new SignJWT({ userId: "user-1", email: "test@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1s")
      .sign(JWT_SECRET);
    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });
});
