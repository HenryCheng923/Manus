/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/** 預設的常用表情關鍵字列表 */
export const DEFAULT_KEYWORDS = [
  "開心", "生氣", "謝謝", "加油", "哭哭",
  "愛心", "驚訝", "無奈", "OK", "讚",
  "早安", "晚安", "再見", "抱歉", "哈哈",
] as const;

/** 額外可選的關鍵字 */
export const EXTRA_KEYWORDS = [
  "好的", "不要", "救命", "吃飯", "睡覺",
  "上班", "下班", "放假", "辛苦了", "沒問題",
  "等等", "快來", "好棒", "傻眼", "崩潰",
  "耶", "嗚嗚", "衝啊", "冷靜", "期待",
] as const;

/** 去背模式 */
export type RemoveBgMode = "smart" | "global";

/** 去背參數 */
export interface RemoveBgParams {
  enabled: boolean;
  mode: RemoveBgMode;
  tolerance: number;
  smoothing: number;
}

// ============================================================
// LINE 靜態貼圖規格
// ============================================================
export const LINE_STICKER_WIDTH = 370;
export const LINE_STICKER_HEIGHT = 320;
export const LINE_MAIN_WIDTH = 240;
export const LINE_MAIN_HEIGHT = 240;
export const LINE_TAB_WIDTH = 96;
export const LINE_TAB_HEIGHT = 74;

/** 靜態貼圖可選張數 */
export const STICKER_COUNT_OPTIONS = [8, 16, 24, 32, 40] as const;
export type StickerCountOption = typeof STICKER_COUNT_OPTIONS[number];
export const DEFAULT_STICKER_COUNT = 8;

// ============================================================
// LINE 動態貼圖規格
// ============================================================
export const LINE_ANIM_STICKER_WIDTH = 320;
export const LINE_ANIM_STICKER_HEIGHT = 270;
export const LINE_ANIM_MAIN_WIDTH = 240;
export const LINE_ANIM_MAIN_HEIGHT = 240;

/** 動態貼圖可選張數 (LINE 官方規定: 8/16/24) */
export const ANIM_STICKER_COUNT_OPTIONS = [8, 16, 24] as const;
export type AnimStickerCountOption = typeof ANIM_STICKER_COUNT_OPTIONS[number];
export const DEFAULT_ANIM_STICKER_COUNT = 8;

/** APNG 規格常數 */
export const APNG_MIN_FRAMES = 5;
export const APNG_MAX_FRAMES = 20;
export const APNG_DEFAULT_FRAMES = 8;
export const APNG_MAX_PLAY_TIME_SECONDS = 4;
export const APNG_LOOP_COUNT = 4; // LINE 規定 1-4 次，配合 1 秒播放時間 = 總共 4 秒
export const APNG_MAX_FILE_SIZE_BYTES = 300 * 1024; // 300KB per file (conservative)

/** 貼圖類型 */
export type StickerType = "static" | "animated";

/** 動畫效果類型 */
export type AnimationEffect =
  | "bounce"     // 上下跳動
  | "shake"      // 左右搖擺
  | "pulse"      // 縮放脈動
  | "swing"      // 鐘擺搖擺
  | "wobble"     // 晃動
  | "tada"       // 驚喜效果
  | "rubberBand" // 橡皮筋拉伸
  | "jello"      // 果凍效果
  | "heartbeat"  // 心跳效果
  | "wave";      // 波浪效果

export const ANIMATION_EFFECTS: AnimationEffect[] = [
  "bounce", "shake", "pulse", "swing", "wobble",
  "tada", "rubberBand", "jello", "heartbeat", "wave",
];

/** 舊的常數保留向下相容 */
export const STICKER_COUNT = 15;
export const GRID_COLS = 3;
export const GRID_ROWS = 5;
