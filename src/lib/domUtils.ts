/**
 * DOM utility functions for element inspection and selection
 */

export interface ElementInfo {
  text: string; // The text content of the element
  type: string; // Semantic type: button, heading, text, image, input, etc.
  tagName: string; // HTML tag name
  selector: string; // CSS selector to uniquely identify the element
}

/**
 * Generate a unique CSS selector for an element
 */
export function generateUniqueSelector(
  element: Element,
  root: Element | null = null,
): string {
  // If element has ID, use it (most specific)
  if (element.id) return `#${element.id}`;

  const path: string[] = [];
  let current: Element | null = element;

  while (
    current &&
    current !== root &&
    current.tagName.toLowerCase() !== "body" &&
    current.tagName.toLowerCase() !== "html"
  ) {
    let selector = current.tagName.toLowerCase();

    // Add meaningful classes (skip utility classes like 'flex', 'p-4', etc.)
    if (current.className && typeof current.className === "string") {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter(
          (c) =>
            c.length > 2 &&
            !c.match(
              /^(p|m|w|h|gap|flex|grid|text|bg|border|rounded|shadow|transition|cursor|opacity|z)-/,
            ),
        )
        .slice(0, 2);
      if (classes.length) {
        selector += "." + classes.join(".");
      }
    }

    // Add nth-of-type if there are siblings with the same tag
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);

    // Stop if we've built a reasonably unique path (max 5 levels)
    if (path.length >= 5) break;

    current = current.parentElement;
  }

  return path.join(" > ");
}

/**
 * Get semantic information about an element
 */
export function getElementInfo(element: Element): ElementInfo {
  const tagName = element.tagName.toLowerCase();

  // Get text content - prefer innerText for visible text, limit length
  let text = "";
  const innerText = (element as HTMLElement).innerText?.trim() || "";
  const textContent = element.textContent?.trim() || "";

  // Use innerText if available (respects visibility), fall back to textContent
  text = innerText || textContent;

  // Limit text length and clean up
  if (text.length > 100) {
    text = text.substring(0, 100) + "...";
  }
  text = text.replace(/\s+/g, " ").trim();

  // Determine semantic type based on tag, role, and classes
  let type = "element";
  const role = element.getAttribute("role");
  const className = element.className?.toString() || "";

  // Check for buttons
  if (
    tagName === "button" ||
    role === "button" ||
    className.includes("btn") ||
    className.includes("button")
  ) {
    type = "button";
  }
  // Check for headings
  else if (/^h[1-6]$/.test(tagName) || role === "heading") {
    type = "heading";
  }
  // Check for images
  else if (tagName === "img" || tagName === "svg" || role === "img") {
    type = "image";
    // For images, get alt text or aria-label
    text =
      element.getAttribute("alt") ||
      element.getAttribute("aria-label") ||
      "image";
  }
  // Check for inputs
  else if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  ) {
    type = "input";
    text =
      (element as HTMLInputElement).placeholder ||
      (element as HTMLInputElement).value ||
      "input field";
  }
  // Check for links
  else if (tagName === "a" || role === "link") {
    type = "link";
  }
  // Check for icons
  else if (
    className.includes("icon") ||
    tagName === "i" ||
    (tagName === "svg" && !text)
  ) {
    type = "icon";
    text = element.getAttribute("aria-label") || "icon";
  }
  // Check for navigation
  else if (
    tagName === "nav" ||
    role === "navigation" ||
    className.includes("nav")
  ) {
    type = "navigation";
  }
  // Check for cards/containers
  else if (
    className.includes("card") ||
    className.includes("container") ||
    className.includes("section")
  ) {
    type = "card";
  }
  // Default to text for elements with text content
  else if (text) {
    type = "text";
  }

  // Generate CSS selector for this element
  const selector = generateUniqueSelector(element);

  return { text, type, tagName, selector };
}
