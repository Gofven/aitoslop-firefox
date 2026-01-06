(function () {
  'use strict';

  if (window.aiToSlopReplacerLoaded) return;
  window.aiToSlopReplacerLoaded = true;

  let isApplying = false;

  function isEditableElement(element) {
    if (!element) return false;

    const tagName = element.tagName?.toLowerCase();
    const editableTags = ['input', 'textarea', 'select', 'option', 'label'];

    if (editableTags.includes(tagName)) return true;

    if (element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    if (element.closest && element.closest('form input, form textarea, form select')) {
      return true;
    }

    const role = element.getAttribute?.('role');
    if (role && ['textbox', 'searchbox', 'combobox', 'spinbutton'].includes(role)) return true;

    let parent = element.parentElement;
    while (parent) {
      if (parent.contentEditable === 'true' || parent.getAttribute('contenteditable') === 'true') return true;

      const parentTag = parent.tagName?.toLowerCase();
      if (editableTags.includes(parentTag)) return true;

      parent = parent.parentElement;
    }

    return false;
  }

  function replaceTextInNode(textNode) {
    if (textNode.nodeType !== Node.TEXT_NODE) return false;
    if (isEditableElement(textNode.parentElement)) return false;

    const originalText = textNode.textContent;
    let newText = originalText;
    let replacements = 0;

    newText = newText.replace(/\bApple(\s+)Intelligence\b/gi, function (match, whitespace) {
      replacements++;
      const applePart = match.toLowerCase().includes('apple') ? (match.includes('Apple') ? 'Apple' : 'apple') : 'Apple';
      const intelligencePart = match.includes('Intelligence') ? 'Slop' : 'slop';
      return applePart + whitespace + intelligencePart;
    });

    newText = newText.replace(/\bChatGPT\b/gi, function (match) {
      replacements++;
      return match === match.toLowerCase() ? 'chatslop' : 'ChatSlop';
    });

    newText = newText.replace(/\bMicrosoft(\s+)(\d+)(\s+)Copilot\b/gi, function (match) {
      replacements++;
      return match === match.toLowerCase() ? 'microsoft 365 slop' : 'Microsoft 365 Slop';
    });

    newText = newText.replace(/\bGithub Copilot\b/gi, function (match) {
      replacements++;
      return match === match.toLowerCase() ? 'github slop' : 'Github Slop';
    });

    newText = newText.replace(/\bArtificial(\s+)Intelligence\b/gi, function (match) {
      replacements++;
      return match[0] === 'A' ? 'Slop' : 'slop';
    });

    newText = newText.replace(/\bAI(\s+)slop\b/gi, function (match, whitespace) {
      replacements++;
      const slopPart = match.includes('Slop') ? 'Slop' : 'slop';
      return 'slop' + whitespace + slopPart;
    });

    newText = newText.replace(/\bAI([A-Z][a-z]+\w*)/g, function (match, trailing) {
      replacements++;
      return 'Slop' + trailing;
    });

    newText = newText.replace(/\b([A-Z][a-z]+\w*)AI/g, function (match, prefix) {
      replacements++;
      return prefix + 'Slop';
    });

    newText = newText.replace(/\bA\.I\./gi, function (match) {
      replacements++;
      return match[0] === 'a' ? 'slop' : 'Slop';
    });

    newText = newText.replace(/\bAI\b/g, function (match) {
      replacements++;
      if (match === 'ai') return 'slop';
      return 'Slop';
    });

    if (replacements > 0 && newText !== originalText) {
      isApplying = true;
      textNode.textContent = newText;
      isApplying = false;
      return true;
    }
    return false;
  }

  function replaceTextInAllNodes(rootNode) {
    if (!rootNode) return 0;

    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parentElement = node.parentElement;
          if (!parentElement) return NodeFilter.FILTER_REJECT;

          const parentTag = parentElement.tagName?.toLowerCase();
          const skipTags = ['script', 'style', 'noscript', 'code', 'pre'];
          if (skipTags.includes(parentTag)) return NodeFilter.FILTER_REJECT;

          if (isEditableElement(parentElement)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let count = 0;
    let node;
    while ((node = walker.nextNode())) {
      if (replaceTextInNode(node)) count++;
    }
    return count;
  }

  // ----- realtime scheduling (microtask: runs basically immediately after DOM mutation) -----
  const pending = new Set();
  let scheduled = false;

  function scheduleFlush() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (isApplying) {
        pending.clear();
        return;
      }

      const batch = Array.from(pending);
      pending.clear();

      for (const n of batch) {
        if (!n) continue;

        if (n.nodeType === Node.TEXT_NODE) {
          if (!isEditableElement(n.parentElement)) replaceTextInNode(n);
          continue;
        }

        if (n.nodeType === Node.ELEMENT_NODE) {
          if (!isEditableElement(n)) replaceTextInAllNodes(n);
          // If the element hosts a shadow root, scan it too
          if (n.shadowRoot) replaceTextInAllNodes(n.shadowRoot);
        }

        // ShadowRoot itself is a DocumentFragment
        if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          replaceTextInAllNodes(n);
        }
      }
    });
  }

  function queueProcess(node) {
    if (!node) return;
    pending.add(node);
    scheduleFlush();
  }

  // ----- Shadow DOM support -----
  const observedRoots = new WeakSet();

  function observeRoot(root) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);

    const observer = new MutationObserver((mutations) => {
      if (isApplying) return;

      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            queueProcess(n);

            // If an element with an open shadow root is added, start observing it
            if (n && n.nodeType === Node.ELEMENT_NODE) {
              if (n.shadowRoot) observeRoot(n.shadowRoot);

              // Also look for descendants that already have open shadow roots
              n.querySelectorAll?.('*').forEach((el) => {
                if (el.shadowRoot) observeRoot(el.shadowRoot);
              });
            }
          });

          queueProcess(m.target);
        } else if (m.type === 'characterData') {
          queueProcess(m.target);
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return observer;
  }

  // Hook attachShadow so we can observe shadow roots created AFTER this script runs
  (function hookAttachShadow() {
    const orig = Element.prototype.attachShadow;
    if (!orig || orig.__aiToSlopHooked) return;

    Element.prototype.attachShadow = function (init) {
      const sr = orig.call(this, init);
      // Only open shadow roots are observable/accessible
      if (sr) {
        observeRoot(sr);
        queueProcess(sr);
      }
      return sr;
    };
    Element.prototype.attachShadow.__aiToSlopHooked = true;
  })();

  function observeEverything() {
    // Observe the top-level document immediately
    observeRoot(document.documentElement);

    // Observe existing open shadow roots already on the page
    document.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) observeRoot(el.shadowRoot);
    });
  }

  function performReplacements() {
    // Initial pass
    replaceTextInAllNodes(document.documentElement);
    // Start realtime observation
    observeEverything();
    // Also schedule a flush in case content arrives right after we attach observers
    queueProcess(document.documentElement);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performReplacements, { once: true });
  } else {
    performReplacements();
  }
})();