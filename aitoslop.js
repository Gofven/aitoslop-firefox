(function() {
    'use strict';
    
    // Prevent multiple executions
    if (window.aiToSlopReplacerLoaded) {
        return;
    }
    window.aiToSlopReplacerLoaded = true;
    
    // Function to check if an element or its parents are editable
    function isEditableElement(element) {
        if (!element) return false;
        
        const tagName = element.tagName?.toLowerCase();
        
        // Check for input fields and other editable elements
        const editableTags = [
            'input', 'textarea', 'select', 'option',
            'button', 'label'
        ];
        
        if (editableTags.includes(tagName)) {
            return true;
        }
        
        // Check for contenteditable
        if (element.contentEditable === 'true' || 
            element.getAttribute('contenteditable') === 'true') {
            return true;
        }
        
        // Check for form elements
        if (element.closest('form input, form textarea, form select')) {
            return true;
        }
        
        // Check for elements with editable roles
        const role = element.getAttribute('role');
        if (role && ['textbox', 'searchbox', 'combobox', 'spinbutton'].includes(role)) {
            return true;
        }
        
        // Check if parent is editable (walk up the tree)
        let parent = element.parentElement;
        while (parent) {
            if (parent.contentEditable === 'true' || 
                parent.getAttribute('contenteditable') === 'true') {
                return true;
            }
            
            const parentTag = parent.tagName?.toLowerCase();
            if (editableTags.includes(parentTag)) {
                return true;
            }
            
            parent = parent.parentElement;
        }
        
        return false;
    }
    
    // Function to replace text in a text node
    function replaceTextInNode(textNode) {
        if (textNode.nodeType === Node.TEXT_NODE) {
            // Check if this text node is inside an editable element
            if (isEditableElement(textNode.parentElement)) {
                return false;
            }
            
            const originalText = textNode.textContent;
            
            // Skip if text contains "AI slop" (case-insensitive)
            if (/AI\s+slop/i.test(originalText)) {
                return false;
            }
            
            // Replace "AI" with "Slop" (case-insensitive, but preserve original case)
            // Use negative lookbehind and lookahead to avoid "AI slop" patterns
            const newText = originalText
                .replace(/\bAI\b(?!\s+slop)/gi, function(match) {
                    // Preserve original case
                    if (match === 'AI') return 'Slop';
                    if (match === 'ai') return 'slop';
                    if (match === 'Ai') return 'Slop';
                    if (match === 'aI') return 'slop';
                    return 'Slop'; // fallback
                });
            
            if (originalText !== newText) {
                textNode.textContent = newText;
                return true;
            }
        }
        return false;
    }
    
    // Function to walk through all text nodes in the document
    function replaceTextInAllNodes(rootNode = document.body) {
        if (!rootNode) return 0;
        
        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip script and style tags
                    const parentElement = node.parentElement;
                    if (!parentElement) return NodeFilter.FILTER_REJECT;
                    
                    const parentTag = parentElement.tagName.toLowerCase();
                    
                    // Skip script, style, and other non-content tags
                    const skipTags = ['script', 'style', 'noscript', 'code', 'pre'];
                    if (skipTags.includes(parentTag)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip if parent is an editable element
                    if (isEditableElement(parentElement)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        const textNodes = [];
        let node;
        
        // Collect all text nodes first to avoid modifying while iterating
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // Replace text in collected nodes
        let replacementsMade = 0;
        textNodes.forEach(textNode => {
            if (replaceTextInNode(textNode)) {
                replacementsMade++;
            }
        });
        
        return replacementsMade;
    }
    
    // Function to handle dynamically added content (for auto mode)
    function observeForChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Don't process if it's an editable element
                        if (!isEditableElement(node)) {
                            replaceTextInAllNodes(node);
                        }
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        // Don't process if parent is editable
                        if (!isEditableElement(node.parentElement)) {
                            replaceTextInNode(node);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        return observer;
    }
    
    // Main execution
    function performReplacements() {
        const replacements = replaceTextInAllNodes();
        console.log(`AI to Slop: Made ${replacements} replacements`);
        
        // Set up observer for dynamic content (if in auto mode)
        if (typeof browser !== 'undefined') {
            browser.storage.local.get(['autoMode']).then(result => {
                if (result.autoMode) {
                    observeForChanges();
                }
            }).catch(() => {
                // Fallback if storage is not available
                // Don't set up observer for manual mode
            });
        }
        
        return replacements;
    }
    
    // Start the replacement
    performReplacements();
})();
