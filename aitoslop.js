(function () {
    'use strict';

    if (window.aiToSlopReplacerLoaded) return;
    window.aiToSlopReplacerLoaded = true;

    let isApplying = false;

    const editableTags = new Set(['textarea', 'select', 'option']);
    const skipTags = new Set(['script', 'style', 'noscript', 'code', 'pre', 'input']);
    const skipClasses = new Set(['QueryBuilder-StyledInputContent']);
    const editableRoles = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);

    function isEditableElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        if (editableTags.has(element.tagName.toLowerCase())) return true;
        if (element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true') return true;

        const role = element.getAttribute('role');
        if (role && editableRoles.has(role)) return true;

        return !!element.closest('[contenteditable="true"], input, textarea, select');
    }

    const combinedRegex = new RegExp([
        'apple intelligence',
        'chatgpt',
        'artificial intelligence',
        'ai[A-Z][a-z]+',
        '[A-Z][a-z]+ai',
        'a\\.i\\.',
        'ai'
    ].map(s => '\\b' + s.replace(/ /g, '\\s+') + '\\b').join('|'), 'gi');

    function replaceTextInNode(textNode) {
        if (isApplying) return false;
        const originalText = textNode.textContent;

        if (!originalText || originalText.length < 2) return false;

        const newText = originalText.replace(combinedRegex, (match) => {
            const lower = match.toLowerCase().trim();

            if (lower.includes('apple')) {
                return match.replace(/intelligence/i, (m) => m[0] === 'I' ? 'Slop' : 'slop');
            }

            if (lower === 'chatgpt') {
                return match === 'ChatGPT' ? 'ChatSlop' : 'chatslop';
            }

            if (lower.includes('artificial')) {
                return match.startsWith('A') ? 'Slop' : 'slop';
            }

            if (match.startsWith('AI') && match.length > 2) {
                return 'Slop' + match.slice(2);
            }

            if (match.endsWith('AI') && match.length > 2) {
                return match.slice(0, -2) + 'Slop';
            }

            if (lower === 'a.i.' || match === 'ai' || match === 'AI') {
                return match[0] === 'A' ? 'Slop' : 'slop';
            }

            return match;
        });

        if (newText !== originalText) {
            isApplying = true;
            textNode.textContent = newText;
            isApplying = false;
            return true;
        }
        return false;
    }

    const skipClassesSelector = skipClasses.size > 0 ? Array.from(skipClasses).map(c => `.${c}`).join(',') : null;

    function replaceTextInAllNodes(rootNode) {
        if (!rootNode) return;
        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || skipTags.has(parent.tagName.toLowerCase()) || isEditableElement(parent)) return NodeFilter.FILTER_REJECT;
                if (skipClassesSelector && parent.closest(skipClassesSelector)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        while (walker.nextNode()) replaceTextInNode(walker.currentNode);
    }

    const pending = new Set();
    let scheduled = false;

    function flush() {
        scheduled = false;
        if (isApplying || pending.size === 0) return;
        const batch = Array.from(pending);
        pending.clear();
        for (const n of batch) {
            if (!n.isConnected) continue;
            if (n.nodeType === Node.TEXT_NODE) {
                replaceTextInNode(n);
            } else if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                replaceTextInAllNodes(n);
                if (n.shadowRoot) replaceTextInAllNodes(n.shadowRoot);
            }
        }
    }

    function queue(node) {
        if (!node) return;
        pending.add(node);
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(flush);
        }
    }

    const observedRoots = new WeakSet();

    function observeRoot(root) {
        if (!root || observedRoots.has(root)) return;
        observedRoots.add(root);
        new MutationObserver((mutations) => {
            if (isApplying) return;
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(n => {
                        queue(n);
                        if (n.nodeType === Node.ELEMENT_NODE) {
                            if (n.shadowRoot) observeRoot(n.shadowRoot);
                            n.querySelectorAll('[shadowroot]').forEach(el => el.shadowRoot && observeRoot(el.shadowRoot));
                        }
                    });
                } else if (m.type === 'characterData') {
                    queue(m.target);
                }
            }
        }).observe(root, {childList: true, subtree: true, characterData: true});
    }

    (function hook() {
        const orig = Element.prototype.attachShadow;
        if (!orig) return;
        Element.prototype.attachShadow = function (init) {
            const sr = orig.call(this, init);
            if (sr && init && init.mode === 'open') {
                observeRoot(sr);
                queue(sr);
            }
            return sr;
        };
    })();

    function init() {
        replaceTextInAllNodes(document.body || document.documentElement);
        observeRoot(document.documentElement);
        document.querySelectorAll('*').forEach(el => el.shadowRoot && observeRoot(el.shadowRoot));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {once: true});
    } else {
        init();
    }
})();