/**
 * Canvas layout utilities for positioning screens
 */

import type { Screen as ApiScreen } from "@/lib/projects";
import type { ScreenData } from "@/types/canvas";
import type { StreamScreen } from "@/lib/chat";

export const SCREEN_SPACING_X = 450;
export const SCREEN_SPACING_Y = 950;
export const DEVICE_WIDTH = 393;
export const DEVICE_HEIGHT = 852;

/**
 * Transforms API screens into positioned canvas screen data
 */
export function layoutScreens(apiScreens: ApiScreen[]): ScreenData[] {
  const mainScreens = apiScreens.filter((s) => !s.parentScreenId);
  const variations = apiScreens.filter((s) => s.parentScreenId);

  // Sort main screens by orderIndex to preserve user-defined order
  const sortedMainScreens = [...mainScreens].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  const variationsByParent = new Map<string, ApiScreen[]>();
  for (const v of variations) {
    const parentId = v.parentScreenId!;
    if (!variationsByParent.has(parentId)) {
      variationsByParent.set(parentId, []);
    }
    variationsByParent.get(parentId)!.push(v);
  }

  const result: ScreenData[] = [];

  sortedMainScreens.forEach((screen, colIndex) => {
    result.push({
      id: screen.id,
      name: screen.name,
      type: screen.type || screen.screenType || "custom",
      parentScreenId: null,
      imageUrl: screen.imageUrl ?? null,
      thumbnailUrl: screen.thumbnailUrl ?? null,
      htmlContent: screen.reactCode ?? screen.htmlContent ?? null,
      reactCode: screen.reactCode ?? null,
      reactNativeCode: screen.reactNativeCode ?? null,
      compiledHtml: screen.compiledHtml ?? null,
      contentType: screen.contentType,
      aiPrompt: screen.aiPrompt ?? null,
      createdAt: screen.createdAt ?? null,
      updatedAt: screen.updatedAt ?? null,
      x: 100 + colIndex * SCREEN_SPACING_X,
      y: 100,
      width: screen.width || DEVICE_WIDTH,
      height: screen.height || DEVICE_HEIGHT,
      visible: true,
    });

    const screenVariations = variationsByParent.get(screen.id) || [];
    screenVariations.forEach((variation, varIndex) => {
      result.push({
        id: variation.id,
        name: variation.name,
        type: variation.type || variation.screenType || "custom",
        parentScreenId: screen.id,
        imageUrl: variation.imageUrl ?? null,
        thumbnailUrl: variation.thumbnailUrl ?? null,
        htmlContent: variation.reactCode ?? variation.htmlContent ?? null,
        reactCode: variation.reactCode ?? null,
        reactNativeCode: variation.reactNativeCode ?? null,
        compiledHtml: variation.compiledHtml ?? null,
        contentType: variation.contentType,
        aiPrompt: variation.aiPrompt ?? null,
        createdAt: variation.createdAt ?? null,
        updatedAt: variation.updatedAt ?? null,
        x: 100 + colIndex * SCREEN_SPACING_X,
        y: 100 + (varIndex + 1) * SCREEN_SPACING_Y,
        width: variation.width || DEVICE_WIDTH,
        height: variation.height || DEVICE_HEIGHT,
        visible: true,
      });
    });
  });

  variations.forEach((v) => {
    if (!mainScreens.find((m) => m.id === v.parentScreenId)) {
      const existingCount = result.length;
      result.push({
        id: v.id,
        name: v.name,
        type: v.type || v.screenType || "custom",
        parentScreenId: v.parentScreenId ?? null,
        imageUrl: v.imageUrl ?? null,
        thumbnailUrl: v.thumbnailUrl ?? null,
        htmlContent: v.reactCode ?? v.htmlContent ?? null,
        reactCode: v.reactCode ?? null,
        reactNativeCode: v.reactNativeCode ?? null,
        compiledHtml: v.compiledHtml ?? null,
        contentType: v.contentType,
        aiPrompt: v.aiPrompt ?? null,
        createdAt: v.createdAt ?? null,
        updatedAt: v.updatedAt ?? null,
        x: 100 + existingCount * SCREEN_SPACING_X,
        y: 100,
        width: v.width || DEVICE_WIDTH,
        height: v.height || DEVICE_HEIGHT,
        visible: true,
      });
    }
  });

  return result;
}

/**
 * Helper function to transform StreamScreen to ScreenData for optimistic updates
 */
export function transformStreamScreenToCanvas(
  screen: StreamScreen,
  existingScreens: ScreenData[],
): ScreenData {
  const mainScreensCount = existingScreens.filter(
    (s) => !s.parentScreenId,
  ).length;

  let x = 100 + mainScreensCount * SCREEN_SPACING_X;
  let y = 100;

  // If this is a variation, position it below its parent
  if (screen.parentScreenId) {
    const parent = existingScreens.find((s) => s.id === screen.parentScreenId);
    if (parent) {
      const existingVariations = existingScreens.filter(
        (s) => s.parentScreenId === screen.parentScreenId,
      );
      x = parent.x;
      y = parent.y + (existingVariations.length + 1) * SCREEN_SPACING_Y;
    }
  }

  return {
    id: screen.id,
    name: screen.name,
    type: "custom",
    parentScreenId: screen.parentScreenId ?? null,
    imageUrl: screen.imageUrl ?? null,
    thumbnailUrl: screen.thumbnailUrl ?? null,
    htmlContent: screen.htmlContent ?? null,
    aiPrompt: screen.aiPrompt ?? null,
    createdAt: screen.createdAt ?? null,
    updatedAt: screen.updatedAt ?? null,
    x,
    y,
    width: screen.width || DEVICE_WIDTH,
    height: screen.height || DEVICE_HEIGHT,
    visible: true,
  };
}
