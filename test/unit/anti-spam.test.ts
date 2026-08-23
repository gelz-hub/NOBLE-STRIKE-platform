import { describe, it, expect } from "vitest";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { checkForSpamLinks } from "@/lib/spam-filter";

describe("isDisposableEmail", () => {
  it("flags known disposable domains", () => {
    expect(isDisposableEmail("someone@mailinator.com")).toBe(true);
    expect(isDisposableEmail("test@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("x@YOPMAIL.COM")).toBe(true);
  });

  it("allows real email providers", () => {
    expect(isDisposableEmail("player@gmail.com")).toBe(false);
    expect(isDisposableEmail("player@outlook.com")).toBe(false);
  });

  it("handles malformed input without throwing", () => {
    expect(isDisposableEmail("not-an-email")).toBe(false);
    expect(isDisposableEmail("")).toBe(false);
  });
});

describe("checkForSpamLinks", () => {
  it("flags known URL shorteners", () => {
    const result = checkForSpamLinks("Check this out https://bit.ly/free-skins");
    expect(result.isSpam).toBe(true);
    expect(result.matchedDomain).toBe("bit.ly");
  });

  it("flags suspicious TLDs", () => {
    const result = checkForSpamLinks("Visit http://free-gems.xyz now");
    expect(result.isSpam).toBe(true);
  });

  it("ignores www. prefix and query strings when matching", () => {
    const result = checkForSpamLinks("http://www.bit.ly/abc?ref=123");
    expect(result.isSpam).toBe(true);
  });

  it("allows normal text and legitimate links", () => {
    const result = checkForSpamLinks("Join our team! Contact us on Telegram @noblestrike or https://noblestrike.gg");
    expect(result.isSpam).toBe(false);
  });

  it("allows plain text with no links at all", () => {
    const result = checkForSpamLinks("Looking for a jungler, must have mic.");
    expect(result.isSpam).toBe(false);
  });
});
