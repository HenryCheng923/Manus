import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  STICKER_COUNT_OPTIONS, DEFAULT_STICKER_COUNT,
  ANIM_STICKER_COUNT_OPTIONS, DEFAULT_ANIM_STICKER_COUNT,
  LINE_STICKER_WIDTH, LINE_STICKER_HEIGHT,
  LINE_ANIM_STICKER_WIDTH, LINE_ANIM_STICKER_HEIGHT,
  LINE_MAIN_WIDTH, LINE_MAIN_HEIGHT,
  LINE_TAB_WIDTH, LINE_TAB_HEIGHT,
  APNG_DEFAULT_FRAMES, APNG_MAX_PLAY_TIME_SECONDS, APNG_LOOP_COUNT,
  ANIMATION_EFFECTS,
} from "../shared/types";

function createAuthContext() {
  const clearedCookies: any[] = [];
  const user = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "google",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createUnauthContext() {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

describe("LINE static sticker specs", () => {
  it("has correct LINE sticker dimensions", () => {
    expect(LINE_STICKER_WIDTH).toBe(370);
    expect(LINE_STICKER_HEIGHT).toBe(320);
  });

  it("has correct LINE main image dimensions", () => {
    expect(LINE_MAIN_WIDTH).toBe(240);
    expect(LINE_MAIN_HEIGHT).toBe(240);
  });

  it("has correct LINE tab image dimensions", () => {
    expect(LINE_TAB_WIDTH).toBe(96);
    expect(LINE_TAB_HEIGHT).toBe(74);
  });

  it("supports correct static sticker count options", () => {
    expect(STICKER_COUNT_OPTIONS).toEqual([8, 16, 24, 32, 40]);
  });

  it("has default sticker count of 8", () => {
    expect(DEFAULT_STICKER_COUNT).toBe(8);
  });

  it("all static sticker count options are multiples of 8", () => {
    for (const count of STICKER_COUNT_OPTIONS) {
      expect(count % 8).toBe(0);
    }
  });
});

describe("LINE animated sticker specs", () => {
  it("has correct animated sticker dimensions", () => {
    expect(LINE_ANIM_STICKER_WIDTH).toBe(320);
    expect(LINE_ANIM_STICKER_HEIGHT).toBe(270);
  });

  it("supports correct animated sticker count options (8/16/24)", () => {
    expect(ANIM_STICKER_COUNT_OPTIONS).toEqual([8, 16, 24]);
  });

  it("has default animated sticker count of 8", () => {
    expect(DEFAULT_ANIM_STICKER_COUNT).toBe(8);
  });

  it("has correct APNG frame defaults", () => {
    expect(APNG_DEFAULT_FRAMES).toBe(8);
    expect(APNG_DEFAULT_FRAMES).toBeGreaterThanOrEqual(5);
    expect(APNG_DEFAULT_FRAMES).toBeLessThanOrEqual(20);
  });

  it("has correct APNG play time limit", () => {
    expect(APNG_MAX_PLAY_TIME_SECONDS).toBe(4);
  });

  it("has valid loop count (1-4)", () => {
    expect(APNG_LOOP_COUNT).toBeGreaterThanOrEqual(1);
    expect(APNG_LOOP_COUNT).toBeLessThanOrEqual(4);
  });

  it("has 10 animation effects", () => {
    expect(ANIMATION_EFFECTS).toHaveLength(10);
    expect(ANIMATION_EFFECTS).toContain("bounce");
    expect(ANIMATION_EFFECTS).toContain("shake");
    expect(ANIMATION_EFFECTS).toContain("pulse");
    expect(ANIMATION_EFFECTS).toContain("swing");
    expect(ANIMATION_EFFECTS).toContain("wobble");
    expect(ANIMATION_EFFECTS).toContain("tada");
    expect(ANIMATION_EFFECTS).toContain("rubberBand");
    expect(ANIMATION_EFFECTS).toContain("jello");
    expect(ANIMATION_EFFECTS).toContain("heartbeat");
    expect(ANIMATION_EFFECTS).toContain("wave");
  });
});

describe("sticker router - authentication", () => {
  it("createProject requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.createProject({ title: "Test", keywords: ["開心"], stickerCount: 8 })
    ).rejects.toThrow();
  });

  it("listProjects requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.sticker.listProjects()).rejects.toThrow();
  });

  it("getProject requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.getProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("updateKeywords validates input - empty keywords rejected", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.updateKeywords({ projectId: 1, keywords: [] })
    ).rejects.toThrow();
  });

  it("uploadTemplate requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.uploadTemplate({ projectId: 1, imageBase64: "abc", mimeType: "image/png" })
    ).rejects.toThrow();
  });
});

describe("sticker router - input validation", () => {
  it("rejects invalid static sticker count (10)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.createProject({
        title: "Test",
        keywords: ["開心"],
        stickerCount: 10 as any,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid static sticker count (15)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.createProject({
        title: "Test",
        keywords: ["開心"],
        stickerCount: 15 as any,
      })
    ).rejects.toThrow();
  });

  it("rejects empty keywords in createProject", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.createProject({
        title: "Test",
        keywords: [],
        stickerCount: 8,
      })
    ).rejects.toThrow();
  });

  it("accepts animated sticker type with valid count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Should succeed with valid animated sticker input
    const result = await caller.sticker.createProject({
      title: "Animated Test",
      keywords: ["開心"],
      stickerCount: 8,
      stickerType: "animated",
    });
    expect(result).toHaveProperty("projectId");
    expect(typeof result.projectId).toBe("number");
  });

  it("accepts animated sticker count of 24 (max for animated)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sticker.createProject({
      title: "Test 24",
      keywords: ["開心"],
      stickerCount: 24,
      stickerType: "animated",
    });
    expect(result).toHaveProperty("projectId");
  });

  it("updateStickerCount rejects invalid count", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.updateStickerCount({ projectId: 1, stickerCount: 12 as any })
    ).rejects.toThrow();
  });

  it("updateStickerType validates enum values", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sticker.updateStickerType({ projectId: 1, stickerType: "invalid" as any })
    ).rejects.toThrow();
  });
});

describe("apngGenerator module", () => {
  it("exports generateApngFromSticker, generateAnimatedMainImage, pickAnimationEffect", async () => {
    const mod = await import("./apngGenerator");
    expect(typeof mod.generateApngFromSticker).toBe("function");
    expect(typeof mod.generateAnimatedMainImage).toBe("function");
    expect(typeof mod.pickAnimationEffect).toBe("function");
  });

  it("pickAnimationEffect cycles through effects correctly", async () => {
    const { pickAnimationEffect } = await import("./apngGenerator");
    const effects = new Set<string>();
    for (let i = 0; i < 10; i++) {
      effects.add(pickAnimationEffect(i));
    }
    // Should have all 10 unique effects
    expect(effects.size).toBe(10);
  });

  it("pickAnimationEffect wraps around after 10", async () => {
    const { pickAnimationEffect } = await import("./apngGenerator");
    expect(pickAnimationEffect(0)).toBe(pickAnimationEffect(10));
    expect(pickAnimationEffect(3)).toBe(pickAnimationEffect(13));
  });
});

describe("removeBg module", () => {
  it("exports removeBackgroundFromBuffer and removeBackgroundFromUrl", async () => {
    const mod = await import("./removeBg");
    expect(typeof mod.removeBackgroundFromBuffer).toBe("function");
    expect(typeof mod.removeBackgroundFromUrl).toBe("function");
  });
});

describe("textOverlay module", () => {
  it("exports addTextToSticker, generateMainImage, generateTabImage", async () => {
    const mod = await import("./textOverlay");
    expect(typeof mod.addTextToSticker).toBe("function");
    expect(typeof mod.generateMainImage).toBe("function");
    expect(typeof mod.generateTabImage).toBe("function");
  });
});
