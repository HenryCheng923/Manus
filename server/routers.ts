import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, googleProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import {
  createStickerProject,
  getStickerProject,
  getUserProjects,
  updateProjectStatus,
  updateProjectTemplateUrl,
  updateProjectKeywords,
  createStickers,
  getProjectStickers,
  updateStickerUrls,
  updateStickerStatus,
  deleteProjectStickers,
  updateProjectMainTab,
  updateProjectStickerCount,
  updateProjectStickerType,
} from "./db";
import {
  STICKER_COUNT_OPTIONS,
  ANIM_STICKER_COUNT_OPTIONS,
  LINE_ANIM_STICKER_WIDTH,
  LINE_ANIM_STICKER_HEIGHT,
} from "@shared/types";
import { addTextToSticker, generateMainImage, generateTabImage } from "./textOverlay";
import { removeBackgroundFromUrl } from "./removeBg";
import { generateApngFromSticker, generateAnimatedMainImage, pickAnimationEffect } from "./apngGenerator";

const MAX_STICKER_COUNT = 40;

// All valid sticker counts (static + animated)
const ALL_VALID_COUNTS = [...STICKER_COUNT_OPTIONS, ...ANIM_STICKER_COUNT_OPTIONS];

/**
 * Background sticker generation for STATIC stickers
 */
async function processStaticStickersInBackground(
  projectId: number,
  userId: number,
  templateImageUrl: string,
  projectTitle: string,
) {
  const stickerList = await getProjectStickers(projectId);
  let completedCount = 0;
  let firstBgRemovedBuffer: Buffer | null = null;

  for (const sticker of stickerList) {
    try {
      await updateStickerStatus(sticker.id, "generating");

      const prompt = `Create a single LINE messaging sticker illustration. IMPORTANT COMPOSITION RULES: The character MUST be drawn LARGE, filling at least 85-90% of the entire image canvas. DO NOT leave excessive empty space or margins around the character. The character should extend close to the edges of the image. Based on the reference image, draw the character in a cute chibi/kawaii style performing the action/emotion: "${sticker.keyword}". The character's expression and body language should clearly convey "${sticker.keyword}". DO NOT include any text, words, letters, numbers, or written characters anywhere in the image. The image must contain ONLY the character illustration with absolutely no text. Style: cute, expressive, colorful hand-drawn illustration with bold clean outlines, vibrant colors, and exaggerated facial expressions. Background MUST be solid pure white (#FFFFFF) with no gradients, patterns, or decorations. Output a square image.`;

      const result = await generateImage({
        prompt,
        originalImages: [{ url: templateImageUrl, mimeType: "image/png" }],
      });

      if (result.url) {
        const bgRemovedBuffer = await removeBackgroundFromUrl(result.url, { tolerance: 30, smoothing: 4 });
        if (!firstBgRemovedBuffer) firstBgRemovedBuffer = bgRemovedBuffer;

        const finalBuffer = await addTextToSticker(bgRemovedBuffer, sticker.keyword, sticker.gridIndex);
        const finalKey = `stickers/${userId}/${projectId}/${nanoid()}_final.png`;
        const { url: finalUrl } = await storagePut(finalKey, finalBuffer, "image/png");

        const bgRemovedKey = `stickers/${userId}/${projectId}/${nanoid()}_nobg.png`;
        const { url: bgRemovedUrl } = await storagePut(bgRemovedKey, bgRemovedBuffer, "image/png");

        await updateStickerUrls(sticker.id, { originalImageUrl: bgRemovedUrl, processedImageUrl: finalUrl });
      } else {
        await updateStickerStatus(sticker.id, "failed");
      }
    } catch (error) {
      console.error(`Failed to generate sticker ${sticker.id}:`, error);
      await updateStickerStatus(sticker.id, "failed");
    }
    completedCount++;
    await updateProjectStatus(projectId, "generating", Math.round((completedCount / stickerList.length) * 100));
  }

  // Generate main.png and tab.png
  if (firstBgRemovedBuffer) {
    try {
      const mainBuffer = await generateMainImage(firstBgRemovedBuffer, projectTitle);
      const mainKey = `projects/${userId}/${projectId}/main_${nanoid()}.png`;
      const { url: mainUrl } = await storagePut(mainKey, mainBuffer, "image/png");

      const tabBuffer = await generateTabImage(firstBgRemovedBuffer);
      const tabKey = `projects/${userId}/${projectId}/tab_${nanoid()}.png`;
      const { url: tabUrl } = await storagePut(tabKey, tabBuffer, "image/png");

      await updateProjectMainTab(projectId, mainUrl, tabUrl);
    } catch (error) {
      console.error("Failed to generate main/tab images:", error);
    }
  }

  await updateProjectStatus(projectId, "completed", 100);
  console.log(`[Background] Static project ${projectId} generation completed`);
}

/**
 * Background sticker generation for ANIMATED stickers
 * Generates static image first, then converts to APNG with animation effects
 */
async function processAnimatedStickersInBackground(
  projectId: number,
  userId: number,
  templateImageUrl: string,
  projectTitle: string,
) {
  const stickerList = await getProjectStickers(projectId);
  let completedCount = 0;
  let firstBgRemovedBuffer: Buffer | null = null;

  for (const sticker of stickerList) {
    try {
      await updateStickerStatus(sticker.id, "generating");

      // Step 1: Generate static image (same as static mode but sized for animation)
      const prompt = `Create a single LINE messaging sticker illustration. IMPORTANT COMPOSITION RULES: The character MUST be drawn LARGE, filling at least 85-90% of the entire image canvas. DO NOT leave excessive empty space or margins around the character. The character should extend close to the edges of the image. Based on the reference image, draw the character in a cute chibi/kawaii style performing the action/emotion: "${sticker.keyword}". The character's expression and body language should clearly convey "${sticker.keyword}". DO NOT include any text, words, letters, numbers, or written characters anywhere in the image. The image must contain ONLY the character illustration with absolutely no text. Style: cute, expressive, colorful hand-drawn illustration with bold clean outlines, vibrant colors, and exaggerated facial expressions. Background MUST be solid pure white (#FFFFFF) with no gradients, patterns, or decorations. Output a square image.`;

      const result = await generateImage({
        prompt,
        originalImages: [{ url: templateImageUrl, mimeType: "image/png" }],
      });

      if (result.url) {
        // Step 2: Remove background
        const bgRemovedBuffer = await removeBackgroundFromUrl(result.url, { tolerance: 30, smoothing: 4 });
        if (!firstBgRemovedBuffer) firstBgRemovedBuffer = bgRemovedBuffer;

        // Step 3: Add text overlay (sized for animated sticker dimensions)
        const finalStaticBuffer = await addTextToSticker(
          bgRemovedBuffer,
          sticker.keyword,
          sticker.gridIndex,
          LINE_ANIM_STICKER_WIDTH,
          LINE_ANIM_STICKER_HEIGHT,
        );

        // Step 4: Convert to APNG with animation effect
        const animEffect = pickAnimationEffect(sticker.gridIndex);
        const apngBuffer = await generateApngFromSticker(finalStaticBuffer, animEffect);

        // Upload APNG
        const apngKey = `stickers/${userId}/${projectId}/${nanoid()}_anim.png`;
        const { url: apngUrl } = await storagePut(apngKey, apngBuffer, "image/png");

        // Also upload the static version as original
        const staticKey = `stickers/${userId}/${projectId}/${nanoid()}_static.png`;
        const { url: staticUrl } = await storagePut(staticKey, finalStaticBuffer, "image/png");

        await updateStickerUrls(sticker.id, {
          originalImageUrl: staticUrl,
          processedImageUrl: apngUrl, // APNG version
        });
      } else {
        await updateStickerStatus(sticker.id, "failed");
      }
    } catch (error) {
      console.error(`Failed to generate animated sticker ${sticker.id}:`, error);
      await updateStickerStatus(sticker.id, "failed");
    }
    completedCount++;
    await updateProjectStatus(projectId, "generating", Math.round((completedCount / stickerList.length) * 100));
  }

  // Generate animated main.png (APNG) and static tab.png
  if (firstBgRemovedBuffer) {
    try {
      // main.png is APNG for animated stickers
      const animMainBuffer = await generateAnimatedMainImage(firstBgRemovedBuffer, "pulse");
      const mainKey = `projects/${userId}/${projectId}/main_${nanoid()}.png`;
      const { url: mainUrl } = await storagePut(mainKey, animMainBuffer, "image/png");

      // tab.png is always static PNG
      const tabBuffer = await generateTabImage(firstBgRemovedBuffer);
      const tabKey = `projects/${userId}/${projectId}/tab_${nanoid()}.png`;
      const { url: tabUrl } = await storagePut(tabKey, tabBuffer, "image/png");

      await updateProjectMainTab(projectId, mainUrl, tabUrl);
    } catch (error) {
      console.error("Failed to generate animated main/tab images:", error);
    }
  }

  await updateProjectStatus(projectId, "completed", 100);
  console.log(`[Background] Animated project ${projectId} generation completed`);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  sticker: router({
    createProject: googleProcedure
      .input(z.object({
        title: z.string().min(1).max(255).default("我的貼圖"),
        stickerType: z.enum(["static", "animated"]).default("static"),
        keywords: z.array(z.string()).min(1).max(MAX_STICKER_COUNT),
        stickerCount: z.number().refine(v => ALL_VALID_COUNTS.includes(v as any), {
          message: "貼圖張數不符合規定",
        }).default(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const projectId = await createStickerProject({
          userId: ctx.user.id,
          title: input.title,
          stickerType: input.stickerType,
          keywords: JSON.stringify(input.keywords),
          stickerCount: input.stickerCount,
          status: "draft",
          progress: 0,
        });
        return { projectId };
      }),

    listProjects: googleProcedure.query(async ({ ctx }) => {
      return getUserProjects(ctx.user.id);
    }),

    getProject: googleProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) return null;
        const stickerList = await getProjectStickers(input.projectId);
        return { ...project, stickers: stickerList };
      }),

    uploadTemplate: googleProcedure
      .input(z.object({
        projectId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string().default("image/png"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) throw new Error("專案不存在");
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const key = `templates/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateProjectTemplateUrl(input.projectId, url);
        return { url };
      }),

    updateStickerCount: googleProcedure
      .input(z.object({
        projectId: z.number(),
        stickerCount: z.number().refine(v => ALL_VALID_COUNTS.includes(v as any), {
          message: "貼圖張數不符合規定",
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) throw new Error("專案不存在");
        await updateProjectStickerCount(input.projectId, input.stickerCount);
        return { success: true };
      }),

    updateStickerType: googleProcedure
      .input(z.object({
        projectId: z.number(),
        stickerType: z.enum(["static", "animated"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) throw new Error("專案不存在");
        await updateProjectStickerType(input.projectId, input.stickerType);
        // If switching to animated, enforce max 24 stickers
        if (input.stickerType === "animated" && project.stickerCount > 24) {
          await updateProjectStickerCount(input.projectId, 24);
        }
        return { success: true };
      }),

    /**
     * generateStickers - Returns immediately and processes in the background
     */
    generateStickers: googleProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) throw new Error("專案不存在");
        if (!project.templateImageUrl) throw new Error("請先上傳模板圖片");
        const keywords: string[] = JSON.parse(project.keywords || "[]");
        if (keywords.length === 0) throw new Error("請先選擇關鍵字");
        if (project.status === "generating") throw new Error("貼圖正在生成中，請稍候");

        await updateProjectStatus(input.projectId, "generating", 0);
        await deleteProjectStickers(input.projectId);

        const stickerData = keywords.map((kw, idx) => ({
          projectId: input.projectId,
          gridIndex: idx,
          keyword: kw,
          status: "pending" as const,
        }));
        await createStickers(stickerData);

        // Choose processing function based on sticker type
        const processFn = project.stickerType === "animated"
          ? processAnimatedStickersInBackground
          : processStaticStickersInBackground;

        processFn(
          input.projectId,
          ctx.user.id,
          project.templateImageUrl!,
          project.title,
        ).catch(err => {
          console.error(`[Background] Project ${input.projectId} generation failed:`, err);
          updateProjectStatus(input.projectId, "failed", 0).catch(() => {});
        });

        return { success: true, message: "生成已開始，請等待完成" };
      }),

    regenerateSticker: googleProcedure
      .input(z.object({ projectId: z.number(), stickerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) throw new Error("專案不存在");
        if (!project.templateImageUrl) throw new Error("模板圖片不存在");
        const stickerList = await getProjectStickers(input.projectId);
        const sticker = stickerList.find(s => s.id === input.stickerId);
        if (!sticker) throw new Error("貼圖不存在");

        await updateStickerStatus(sticker.id, "generating");

        // Fire-and-forget
        (async () => {
          try {
            const prompt = `Create a single LINE messaging sticker illustration. IMPORTANT COMPOSITION RULES: The character MUST be drawn LARGE, filling at least 85-90% of the entire image canvas. DO NOT leave excessive empty space or margins around the character. The character should extend close to the edges of the image. Based on the reference image, draw the character in a cute chibi/kawaii style performing the action/emotion: "${sticker.keyword}". The character's expression and body language should clearly convey "${sticker.keyword}". DO NOT include any text, words, letters, numbers, or written characters anywhere in the image. The image must contain ONLY the character illustration with absolutely no text. Style: cute, expressive, colorful hand-drawn illustration with bold clean outlines, vibrant colors, and exaggerated facial expressions. Background MUST be solid pure white (#FFFFFF) with no gradients, patterns, or decorations. Output a square image.`;

            const result = await generateImage({
              prompt,
              originalImages: [{ url: project.templateImageUrl!, mimeType: "image/png" }],
            });

            if (result.url) {
              const bgRemovedBuffer = await removeBackgroundFromUrl(result.url, { tolerance: 30, smoothing: 4 });

              if (project.stickerType === "animated") {
                // Animated: add text then convert to APNG
                const finalStaticBuffer = await addTextToSticker(
                  bgRemovedBuffer, sticker.keyword, sticker.gridIndex,
                  LINE_ANIM_STICKER_WIDTH, LINE_ANIM_STICKER_HEIGHT,
                );
                const animEffect = pickAnimationEffect(sticker.gridIndex);
                const apngBuffer = await generateApngFromSticker(finalStaticBuffer, animEffect);

                const apngKey = `stickers/${ctx.user.id}/${input.projectId}/${nanoid()}_anim.png`;
                const { url: apngUrl } = await storagePut(apngKey, apngBuffer, "image/png");
                const staticKey = `stickers/${ctx.user.id}/${input.projectId}/${nanoid()}_static.png`;
                const { url: staticUrl } = await storagePut(staticKey, finalStaticBuffer, "image/png");

                await updateStickerUrls(sticker.id, { originalImageUrl: staticUrl, processedImageUrl: apngUrl });
              } else {
                // Static: add text overlay
                const stickerIdx = stickerList.findIndex(s => s.id === sticker.id);
                const finalBuffer = await addTextToSticker(bgRemovedBuffer, sticker.keyword, stickerIdx >= 0 ? stickerIdx : 0);

                const finalKey = `stickers/${ctx.user.id}/${input.projectId}/${nanoid()}_final.png`;
                const { url: finalUrl } = await storagePut(finalKey, finalBuffer, "image/png");
                const bgRemovedKey = `stickers/${ctx.user.id}/${input.projectId}/${nanoid()}_nobg.png`;
                const { url: bgRemovedUrl } = await storagePut(bgRemovedKey, bgRemovedBuffer, "image/png");

                await updateStickerUrls(sticker.id, { originalImageUrl: bgRemovedUrl, processedImageUrl: finalUrl });
              }
            } else {
              await updateStickerStatus(sticker.id, "failed");
            }
          } catch (error) {
            console.error(`[Background] Regenerate sticker ${sticker.id} failed:`, error);
            await updateStickerStatus(sticker.id, "failed");
          }
        })();

        return { success: true, message: "重新生成已開始" };
      }),

    updateKeywords: googleProcedure
      .input(z.object({
        projectId: z.number(),
        keywords: z.array(z.string()).min(1).max(MAX_STICKER_COUNT),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getStickerProject(input.projectId, ctx.user.id);
        if (!project) throw new Error("專案不存在");
        await updateProjectKeywords(input.projectId, JSON.stringify(input.keywords));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
