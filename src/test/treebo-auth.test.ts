import { describe, expect, it } from "vitest";
import { isTreeboEmail, safeReturnPath } from "@/lib/treebo-auth";

describe("Treebo email domain check", () => {
  it.each(["person@treebo.com", "Person@Treebo.com", " person@treebo.com "])("accepts %s", (email) => {
    expect(isTreeboEmail(email)).toBe(true);
  });

  it.each(["person@gmail.com", "person@treebo.com.evil.test", "treebo.com@gmail.com", "person@sub.treebo.com", "", null, undefined])("rejects %s", (email) => {
    expect(isTreeboEmail(email)).toBe(false);
  });
});

describe("post-login return path", () => {
  it("keeps same-origin app paths and rejects external or auth-loop destinations", () => {
    expect(safeReturnPath("/pages?city=Pune")).toBe("/pages?city=Pune");
    expect(safeReturnPath("https://example.com")).toBe("/");
    expect(safeReturnPath("//example.com")).toBe("/");
    expect(safeReturnPath("/login")).toBe("/");
  });
});
