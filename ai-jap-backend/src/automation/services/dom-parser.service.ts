import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

@Injectable()
export class DomParserService {
  private readonly logger = new Logger(DomParserService.name);

  /**
   * Condenses the DOM into a token-efficient format for LLM processing.
   * Extracts actionable elements (inputs, buttons, selects) and meaningful text.
   */
  async getCondensedDom(page: Page): Promise<string> {
    try {
      // Evaluate script in the browser context to parse the DOM
      const condensedDom = await page.evaluate(() => {
        // Elements to ignore
        const IGNORE_TAGS = ['SCRIPT', 'NOSCRIPT', 'STYLE', 'SVG', 'PATH', 'IFRAME', 'IMG'];
        
        // Helper to check if an element is visible
        const isVisible = (element: HTMLElement) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetWidth > 0 && element.offsetHeight > 0;
        };

        const processNode = (node: HTMLElement): any => {
          if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
          if (IGNORE_TAGS.includes(node.tagName) || !isVisible(node)) return null;

          // If it's a structural element (div, span, p) and it only contains text, just return the text
          const isInteractive = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(node.tagName) || node.hasAttribute('role');
          
          let attributesStr = '';
          
          // Keep relevant attributes
          const relevantAttributes = ['id', 'name', 'type', 'placeholder', 'aria-label', 'role', 'value'];
          for (const attr of relevantAttributes) {
            if (node.hasAttribute(attr)) {
              attributesStr += ` ${attr}="${node.getAttribute(attr)}"`;
            }
          }
          
          // For select elements, we need the options
          if (node.tagName === 'SELECT') {
            const selectElement = node as HTMLSelectElement;
            const options = Array.from(selectElement.options).map(opt => opt.text || opt.value).join(', ');
            attributesStr += ` options="[${options}]"`;
          }

          let innerText = '';
          // We only want direct text nodes of this element
          for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent?.trim();
              if (text) innerText += text + ' ';
            }
          }
          innerText = innerText.trim();

          const children = [];
          for (const child of Array.from(node.children)) {
            const childResult = processNode(child as HTMLElement);
            if (childResult) {
              children.push(childResult);
            }
          }

          if (isInteractive || attributesStr || innerText || children.length > 0) {
            // Simplified string representation for the LLM
            const tag = node.tagName.toLowerCase();
            let result = `<${tag}${attributesStr}>${innerText}`;
            if (children.length > 0) {
              if (children.length === 1 && typeof children[0] === 'string' && !children[0].startsWith('<')) {
                 result += children[0];
              } else {
                 result += `\\n  ${children.join('\\n  ')}\\n`;
              }
            }
            result += `</${tag}>`;
            return result;
          }
          return null;
        };

        const bodyResult = processNode(document.body);
        return bodyResult || '<body>No content extracted</body>';
      });

      return condensedDom;
    } catch (error) {
      this.logger.error('Failed to parse DOM', error);
      throw new Error('DOM Parsing Failed');
    }
  }
}
