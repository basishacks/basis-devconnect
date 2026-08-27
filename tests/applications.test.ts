import { describe, expect, test } from "bun:test";
import { scryptSync, timingSafeEqual } from "node:crypto";
import {
  applicationFromRow,
  canManageApplication,
  generateClientSecret,
  hashClientSecret,
  parseApplicationInput,
  parseApplicationMetadata,
} from "../server/utils/applications";

describe("application input validation", () => {
  test("normalizes a valid application request", () => {
    expect(
      parseApplicationInput({
        name: "  Example App  ",
        clientType: "confidential",
        redirectUris: [
          "https://example.com/callback",
          "http://localhost:3000/callback",
        ],
      }),
    ).toEqual({
      name: "Example App",
      clientType: "confidential",
      redirectUris: [
        "https://example.com/callback",
        "http://localhost:3000/callback",
      ],
    });
  });

  test("rejects insecure, duplicate, and fragment redirect URIs", () => {
    expect(() =>
      parseApplicationInput({
        name: "Example",
        clientType: "public",
        redirectUris: ["http://example.com/callback"],
      }),
    ).toThrow();
    expect(() =>
      parseApplicationInput({
        name: "Example",
        clientType: "public",
        redirectUris: [
          "https://example.com/callback",
          "https://example.com/callback",
        ],
      }),
    ).toThrow();
    expect(() =>
      parseApplicationInput({
        name: "Example",
        clientType: "public",
        redirectUris: ["https://example.com/callback#fragment"],
      }),
    ).toThrow();
  });
});

describe("application ownership", () => {
  const metadata = parseApplicationMetadata(
    {
      name: "Example",
      owners: [
        { id: "admin-user", role: "ROLE.ADMIN" },
        { id: "general-user", role: "role.GENERAL" },
      ],
      redirectUris: ["https://example.com/callback"],
      public: false,
      scopes: ["openid"],
    },
    "client-id",
  );

  test("grants management only to an application admin", () => {
    expect(canManageApplication(metadata, "admin-user")).toBe(true);
    expect(canManageApplication(metadata, "general-user")).toBe(false);
    expect(canManageApplication(metadata, "other-user")).toBe(false);
  });

  test("returns a sanitized application without secret hashes or owner metadata", () => {
    const result = applicationFromRow(
      {
        clientId: "client-id",
        metadata,
        secretHash: "must-not-leak",
        resources: ["urn:basis:api"],
        requireConsent: true,
        filterMode: null,
        filterContent: [],
        updatedAt: "2026-08-27T00:00:00.000Z",
      },
      "admin-user",
    );

    expect(result.canManage).toBe(true);
    expect(result).not.toHaveProperty("secretHash");
    expect(result).not.toHaveProperty("owners");
  });
});

describe("confidential client secrets", () => {
  test("generates a Basis Auth-compatible scrypt hash", async () => {
    const secret = generateClientSecret();
    const encoded = await hashClientSecret(secret);
    const [algorithm, saltValue, digestValue] = encoded.split(":");

    expect(secret).toStartWith("sk_");
    expect(algorithm).toBe("scrypt");
    expect(saltValue).toBeTruthy();
    expect(digestValue).toBeTruthy();

    const expected = Buffer.from(digestValue!, "base64url");
    const actual = scryptSync(
      secret,
      Buffer.from(saltValue!, "base64url"),
      expected.length,
    );
    expect(timingSafeEqual(actual, expected)).toBe(true);
  });
});
