/**
 * Screenshot Service for capturing screenshots from preview preview
 *
 * Uses postMessage to communicate with the injected ScreenshotHelper component
 * inside the iframe running the generated Next.js app.
 *
 * Flow:
 * 1. Navigate iframe to screen URL
 * 2. Wait for page load
 * 3. Send CAPTURE_SCREENSHOT message with dimensions
 * 4. Listen for SCREENSHOT_CAPTURED or SCREENSHOT_ERROR response
 * 5. Return base64 image data
 */

/**
 * Represents a screen to capture
 */
export interface Screen {
  id: string;
  path: string;
  screenName: string;
}

/**
 * Result of a screenshot capture operation
 */
export interface ScreenshotResult {
  screenId: string;
  imageData: string; // base64 encoded PNG
  error?: string;
}

/**
 * Progress callback for batch capture operations
 */
export type ScreenshotProgressCallback = (current: number, total: number) => void;

/**
 * Internal type for tracking pending capture promises
 */
interface PendingCapture {
  resolve: (result: ScreenshotResult) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Message types sent to the iframe
 */
interface CaptureScreenshotMessage {
  type: 'CAPTURE_SCREENSHOT';
  screenPath: string;
  width: number;
  height: number;
}

/**
 * Message types received from the iframe
 */
interface ScreenshotCapturedMessage {
  type: 'SCREENSHOT_CAPTURED';
  screenPath: string;
  imageData: string;
}

interface ScreenshotErrorMessage {
  type: 'SCREENSHOT_ERROR';
  screenPath: string;
  error: string;
}

type ScreenshotMessage = ScreenshotCapturedMessage | ScreenshotErrorMessage;

/**
 * Default capture dimensions (iPhone 14 Pro viewport)
 */
const DEFAULT_CAPTURE_WIDTH = 393;
const DEFAULT_CAPTURE_HEIGHT = 852;

/**
 * Timeout for screenshot capture (milliseconds)
 */
const CAPTURE_TIMEOUT_MS = 10000;

/**
 * Delay between batch captures to allow cleanup (milliseconds)
 */
const BATCH_CAPTURE_DELAY_MS = 300;

/**
 * Delay after page load before capturing (milliseconds)
 */
const POST_LOAD_DELAY_MS = 500;

/**
 * ScreenshotService handles capturing screenshots from a preview preview iframe.
 *
 * Usage:
 * ```typescript
 * const service = new ScreenshotService(iframeElement, 'http://localhost:3000');
 *
 * // Capture single screen
 * const result = await service.captureScreen({
 *   id: 'screen-1',
 *   path: '/app/home/page.tsx',
 *   screenName: 'Home'
 * });
 *
 * // Capture all screens with progress
 * const results = await service.captureAllScreens(screens, (current, total) => {
 *   console.log(`Capturing ${current} of ${total}`);
 * });
 *
 * // Cleanup when done
 * service.destroy();
 * ```
 */
export class ScreenshotService {
  private iframeRef: HTMLIFrameElement;
  private baseUrl: string;
  private pendingCaptures: Map<string, PendingCapture> = new Map();
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private isDestroyed = false;

  /**
   * Create a new ScreenshotService
   * @param iframeRef - Reference to the iframe element showing the preview
   * @param baseUrl - Base URL of the preview dev server (e.g., 'http://localhost:3000')
   */
  constructor(iframeRef: HTMLIFrameElement, baseUrl: string) {
    this.iframeRef = iframeRef;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash

    // Bind and store the message handler so we can remove it later
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Handle incoming postMessage events from the iframe
   */
  private handleMessage(event: MessageEvent<ScreenshotMessage>): void {
    if (this.isDestroyed) return;

    const data = event.data;

    if (data.type === 'SCREENSHOT_CAPTURED') {
      const pending = this.pendingCaptures.get(data.screenPath);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pending.resolve({
          screenId: data.screenPath,
          imageData: data.imageData,
        });
        this.pendingCaptures.delete(data.screenPath);
      }
    }

    if (data.type === 'SCREENSHOT_ERROR') {
      const pending = this.pendingCaptures.get(data.screenPath);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error(data.error));
        this.pendingCaptures.delete(data.screenPath);
      }
    }
  }

  /**
   * Capture a screenshot of a single screen
   * @param screen - The screen to capture
   * @param options - Optional capture options
   * @returns Promise resolving to the screenshot result
   */
  async captureScreen(
    screen: Screen,
    options?: { width?: number; height?: number }
  ): Promise<ScreenshotResult> {
    if (this.isDestroyed) {
      throw new Error('ScreenshotService has been destroyed');
    }

    const width = options?.width ?? DEFAULT_CAPTURE_WIDTH;
    const height = options?.height ?? DEFAULT_CAPTURE_HEIGHT;
    const screenUrl = this.getScreenUrl(screen.path);

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingCaptures.delete(screen.path);
        reject(new Error(`Screenshot capture timeout for ${screen.screenName}`));
      }, CAPTURE_TIMEOUT_MS);

      // Store pending capture
      this.pendingCaptures.set(screen.path, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeoutId,
      });

      // Set up load handler
      const loadHandler = () => {
        // Remove the load handler to prevent multiple triggers
        this.iframeRef.removeEventListener('load', loadHandler);

        // Give the page time to render fully
        setTimeout(() => {
          if (this.isDestroyed) {
            this.pendingCaptures.delete(screen.path);
            reject(new Error('ScreenshotService destroyed during capture'));
            return;
          }

          // Send capture message to iframe
          const message: CaptureScreenshotMessage = {
            type: 'CAPTURE_SCREENSHOT',
            screenPath: screen.path,
            width,
            height,
          };

          this.iframeRef.contentWindow?.postMessage(message, '*');
        }, POST_LOAD_DELAY_MS);
      };

      // Add load handler and navigate
      this.iframeRef.addEventListener('load', loadHandler);
      this.iframeRef.src = screenUrl;
    });
  }

  /**
   * Capture screenshots of all screens sequentially
   * @param screens - Array of screens to capture
   * @param onProgress - Optional callback for progress updates
   * @param options - Optional capture options
   * @returns Promise resolving to array of screenshot results
   */
  async captureAllScreens(
    screens: Screen[],
    onProgress?: ScreenshotProgressCallback,
    options?: { width?: number; height?: number }
  ): Promise<ScreenshotResult[]> {
    if (this.isDestroyed) {
      throw new Error('ScreenshotService has been destroyed');
    }

    const results: ScreenshotResult[] = [];

    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];

      // Report progress
      onProgress?.(i + 1, screens.length);

      try {
        const result = await this.captureScreen(screen, options);
        results.push(result);
      } catch (error) {
        // Continue capturing other screens even if one fails
        results.push({
          screenId: screen.id,
          imageData: '',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Small delay between captures to allow cleanup
      if (i < screens.length - 1) {
        await this.delay(BATCH_CAPTURE_DELAY_MS);
      }
    }

    return results;
  }

  /**
   * Convert a screen file path to a route URL
   *
   * Examples:
   * - /app/home/page.tsx -> /home
   * - /app/page.tsx -> /
   * - /app/settings/profile/page.tsx -> /settings/profile
   * - app/home/page.tsx -> /home
   *
   * @param screenPath - The file path of the screen (e.g., '/app/home/page.tsx')
   * @returns The route URL (e.g., '/home')
   */
  getScreenUrl(screenPath: string): string {
    // Remove leading slash if present for consistent processing
    let path = screenPath.startsWith('/') ? screenPath.slice(1) : screenPath;

    // Remove 'app/' prefix
    if (path.startsWith('app/')) {
      path = path.slice(4);
    }

    // Remove page.tsx or page.ts suffix
    path = path
      .replace(/\/page\.tsx$/, '')
      .replace(/\/page\.ts$/, '')
      .replace(/page\.tsx$/, '')
      .replace(/page\.ts$/, '');

    // Ensure route starts with /
    const route = path ? `/${path}` : '/';

    return `${this.baseUrl}${route}`;
  }

  /**
   * Cancel all pending captures
   */
  cancelAllCaptures(): void {
    for (const [, pending] of this.pendingCaptures) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Capture cancelled'));
    }
    this.pendingCaptures.clear();
  }

  /**
   * Check if there are any pending captures
   */
  hasPendingCaptures(): boolean {
    return this.pendingCaptures.size > 0;
  }

  /**
   * Get the number of pending captures
   */
  getPendingCaptureCount(): number {
    return this.pendingCaptures.size;
  }

  /**
   * Cleanup the service and remove event listeners
   * Call this when the service is no longer needed
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Remove message listener
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    // Cancel all pending captures
    this.cancelAllCaptures();
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a screenshot service instance
 * Convenience function for creating a new ScreenshotService
 */
export function createScreenshotService(
  iframeRef: HTMLIFrameElement,
  baseUrl: string
): ScreenshotService {
  return new ScreenshotService(iframeRef, baseUrl);
}
