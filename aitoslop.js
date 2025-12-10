(function() {
    'use strict';
    
    // Function to replace text in a text node
    function replaceTextInNode(textNode) {
        if (textNode.nodeType === Node.TEXT_NODE) {
            const originalText = textNode.textContent;
            
            // Replace "AI" with "Slop" (case-insensitive, but preserve original case)
            const newText = originalText.replace(/\bAI\b/g, 'Slop')
                                      .replace(/\bai\b/g, 'slop')
                                      .replace(/\bAi\b/g, 'Slop')
                                      .replace(/\baI\b/g, 'slop');
            
            if (originalText !== newText) {
                textNode.textContent = newText;
                return true;
            }
        }
        return false;
    }
    
    // Function to walk through all text nodes in the document
    function replaceTextInAllNodes(rootNode = document.body) {
        if (!rootNode) return;
        
        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip script and style tags
                    const parentTag = node.parentElement?.tagName.toLowerCase();
                    if (parentTag === 'script' || parentTag === 'style') {
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
    
    // Function to handle dynamically added content
    function observeForChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        replaceTextInAllNodes(node);
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        replaceTextInNode(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Main execution
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                performReplacements();
            });
        } else {
            performReplacements();
        }
    }
    
    function performReplacements() {
        // Initial replacement
        const initialReplacements = replaceTextInAllNodes();
        console.log(`AI to Slop: Made ${initialReplacements} initial replacements`);
        
        // Set up observer for dynamic content
        if (document.body) {
            observeForChanges();
        }
    }
    
    // Start the extension
    init();
})();