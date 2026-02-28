import { toPng } from 'html-to-image';

const DEVICE_WIDTH = 393;
const DEVICE_HEIGHT = 852;
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 800;

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  scale?: number;
  quality?: number;
}

export interface CoverOptions {
  width?: number;
  height?: number;
}

const SCROLLBAR_HIDE_CSS = `<style>html,body{overflow:hidden}::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}</style>`;

function ensureHtmlStructure(htmlContent: string): string {
  if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
    let html = htmlContent;
    if (!html.includes('tailwindcss')) {
      html = html.replace(
        '</head>',
        `<script src="https://cdn.tailwindcss.com"></script></head>`,
      );
    }
    if (!html.includes('iconify')) {
      html = html.replace(
        '</head>',
        `<script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script></head>`,
      );
    }
    html = html.replace('</head>', `${SCROLLBAR_HIDE_CSS}</head>`);
    return html;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow: hidden;
    }
    ::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; -ms-overflow-style: none; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}

function buildCarouselHtml(imageUrls: string[], width: number, height: number): string {
  const screenCount = imageUrls.length;
  const phoneWidth = 180;
  const phoneHeight = 390;
  const centerIndex = Math.floor(screenCount / 2);

  const screenElements = imageUrls
    .map((url, index) => {
      const offset = index - centerIndex;
      const xOffset = offset * 160;
      const zOffset = -Math.abs(offset) * 80;
      const rotation = offset * -8;
      const scale = 1 - Math.abs(offset) * 0.08;
      const zIndex = screenCount - Math.abs(offset);
      const opacity = 1 - Math.abs(offset) * 0.15;

      return `
      <div class="phone-mockup" style="
        position: absolute;
        left: 50%;
        top: 50%;
        width: ${phoneWidth}px;
        height: ${phoneHeight}px;
        transform: translate(-50%, -50%) translateX(${xOffset}px) translateZ(${zOffset}px) rotateY(${rotation}deg) scale(${scale});
        z-index: ${zIndex};
        opacity: ${opacity};
      ">
        <div class="phone-frame" style="
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 36px;
          padding: 8px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        ">
          <div class="phone-notch" style="
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 24px;
            background: #000;
            border-radius: 12px;
            z-index: 10;
          "></div>
          <div class="phone-screen" style="
            width: 100%;
            height: 100%;
            border-radius: 28px;
            overflow: hidden;
            background: #000;
          ">
            <img src="${url}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: top;
            " crossorigin="anonymous" />
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(135deg, #0f0a1e 0%, #1a1030 50%, #0a0515 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .carousel-container {
      position: relative;
      width: 100%;
      height: 100%;
      perspective: 1200px;
      transform-style: preserve-3d;
    }
    .glow-effect {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0) 70%);
      filter: blur(40px);
      z-index: 0;
    }
  </style>
</head>
<body>
  <div class="carousel-container">
    <div class="glow-effect"></div>
    ${screenElements}
  </div>
</body>
</html>`;
}

async function waitForResources(iframe: HTMLIFrameElement, timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkReady = () => {
      const doc = iframe.contentDocument;
      if (!doc) {
        resolve();
        return;
      }

      const images = doc.querySelectorAll('img');
      const allImagesLoaded = Array.from(images).every(
        (img) => img.complete && img.naturalHeight !== 0,
      );

      if (allImagesLoaded || Date.now() - startTime > timeout) {
        setTimeout(resolve, 300);
      } else {
        requestAnimationFrame(checkReady);
      }
    };

    iframe.onload = () => {
      setTimeout(checkReady, 500);
    };

    setTimeout(() => resolve(), timeout);
  });
}

export async function generateScreenThumbnail(
  htmlContent: string,
  options: ScreenshotOptions = {},
): Promise<Blob> {
  const { width = DEVICE_WIDTH, height = DEVICE_HEIGHT, scale = 2 } = options;

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    z-index: -1;
  `;
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    border: none;
    transform: scale(1);
    transform-origin: top left;
  `;
  iframe.sandbox.add('allow-scripts', 'allow-same-origin');
  container.appendChild(iframe);

  const fullHtml = ensureHtmlStructure(htmlContent);
  iframe.srcdoc = fullHtml;

  await waitForResources(iframe, 5000);

  try {
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc || !iframeDoc.body) {
      throw new Error('Could not access iframe content');
    }

    const dataUrl = await toPng(iframeDoc.body, {
      width,
      height,
      pixelRatio: scale,
      cacheBust: true,
      skipAutoScale: true,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
    });

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateProjectCover(
  screenImageUrls: string[],
  options: CoverOptions = {},
): Promise<Blob> {
  const { width = COVER_WIDTH, height = COVER_HEIGHT } = options;

  if (screenImageUrls.length < 3) {
    throw new Error('At least 3 screen images are required to generate a cover');
  }

  const imagesToUse = screenImageUrls.slice(0, 5);

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    z-index: -1;
  `;
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    border: none;
  `;
  iframe.sandbox.add('allow-scripts', 'allow-same-origin');
  container.appendChild(iframe);

  const carouselHtml = buildCarouselHtml(imagesToUse, width, height);
  iframe.srcdoc = carouselHtml;

  await waitForResources(iframe, 8000);

  try {
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc || !iframeDoc.body) {
      throw new Error('Could not access iframe content');
    }

    const dataUrl = await toPng(iframeDoc.body, {
      width,
      height,
      pixelRatio: 2,
      cacheBust: true,
    });

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } finally {
    document.body.removeChild(container);
  }
}