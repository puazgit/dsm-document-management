'use client';

import { useEffect } from 'react';

interface SecurityHookOptions {
  onSecurityViolation?: (type: string, details: any) => void;
  blockRightClick?: boolean;
  blockKeyboardShortcuts?: boolean;
  blockTextSelection?: boolean;
  blockDragAndDrop?: boolean;
  detectDevTools?: boolean;
  blockPrintScreen?: boolean;
}

export function useSecurityMeasures({
  onSecurityViolation,
  blockRightClick = true,
  blockKeyboardShortcuts = true,
  blockTextSelection = false,
  blockDragAndDrop = true,
  detectDevTools = true,
  blockPrintScreen = true
}: SecurityHookOptions = {}) {

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const violations: Array<{ type: string; timestamp: number; details: any }> = [];

    const reportViolation = (type: string, details: any = {}) => {
      const violation = {
        type,
        timestamp: Date.now(),
        details
      };
      violations.push(violation);
      console.warn('Security violation:', violation);
      onSecurityViolation?.(type, violation);
    };

    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      if (blockRightClick) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('RIGHT_CLICK_BLOCKED', { 
          target: (e.target as Element)?.tagName,
          x: e.clientX,
          y: e.clientY
        });
        return false;
      }
      return true;
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!blockKeyboardShortcuts) return true;

      const blockedShortcuts = [
        // Developer tools
        e.key === 'F12',
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I', // DevTools
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C', // Console
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J', // Console
        (e.ctrlKey || e.metaKey) && e.key === 'U', // View Source
        
        // Print and save
        (e.ctrlKey || e.metaKey) && e.key === 'p', // Print
        (e.ctrlKey || e.metaKey) && e.key === 's', // Save
        
        // Copy and select (if enabled)
        blockTextSelection && (e.ctrlKey || e.metaKey) && e.key === 'c', // Copy
        blockTextSelection && (e.ctrlKey || e.metaKey) && e.key === 'a', // Select All
        blockTextSelection && (e.ctrlKey || e.metaKey) && e.key === 'x', // Cut
        
        // Print screen
        blockPrintScreen && e.key === 'PrintScreen',
        
        // Refresh (can be used to bypass restrictions)
        e.key === 'F5',
        (e.ctrlKey || e.metaKey) && e.key === 'r',
        
        // Zoom shortcuts (optional - might be allowed for accessibility)
        (e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)
      ];

      if (blockedShortcuts.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('KEYBOARD_SHORTCUT_BLOCKED', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey
        });
        return false;
      }
      return true;
    };

    // Block text selection
    const handleSelectStart = (e: Event) => {
      if (blockTextSelection) {
        e.preventDefault();
        reportViolation('TEXT_SELECTION_BLOCKED', {
          target: (e.target as Element)?.tagName
        });
        return false;
      }
      return true;
    };

    // Block drag and drop
    const handleDragStart = (e: DragEvent) => {
      if (blockDragAndDrop) {
        e.preventDefault();
        reportViolation('DRAG_DROP_BLOCKED', {
          target: (e.target as Element)?.tagName
        });
        return false;
      }
      return true;
    };

    const handleDrop = (e: DragEvent) => {
      if (blockDragAndDrop) {
        e.preventDefault();
        reportViolation('DROP_BLOCKED', {
          target: (e.target as Element)?.tagName
        });
        return false;
      }
      return true;
    };

    // Detect developer tools
    let devToolsInterval: NodeJS.Timeout | null = null;
    if (detectDevTools && typeof window !== 'undefined') {
      devToolsInterval = setInterval(() => {
        const threshold = 160;
        const heightDiff = window.outerHeight - window.innerHeight;
        const widthDiff = window.outerWidth - window.innerWidth;
        
        if (heightDiff > threshold || widthDiff > threshold) {
          reportViolation('DEV_TOOLS_DETECTED', {
            heightDiff,
            widthDiff,
            outerWidth: window.outerWidth,
            innerWidth: window.innerWidth,
            outerHeight: window.outerHeight,
            innerHeight: window.innerHeight
          });
        }
      }, 1000);
    }

    // Block print screen
    const handleKeyUp = (e: KeyboardEvent) => {
      if (blockPrintScreen && e.key === 'PrintScreen') {
        reportViolation('PRINT_SCREEN_BLOCKED', {});
        // Clear clipboard to prevent screenshot saving
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    };

    // Block image saving
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    // Disable image context menu and saving
    const handleImageContextMenu = (e: MouseEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
        reportViolation('IMAGE_CONTEXT_MENU_BLOCKED', {
          src: (e.target as HTMLImageElement).src
        });
      }
    };

    // Add event listeners (only on client-side)
    let images: NodeListOf<HTMLImageElement> | null = null;
    
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('contextmenu', handleContextMenu, { passive: false });
      document.addEventListener('keydown', handleKeyDown, { passive: false });
      document.addEventListener('keyup', handleKeyUp, { passive: false });
      document.addEventListener('selectstart', handleSelectStart, { passive: false });
      document.addEventListener('dragstart', handleDragStart, { passive: false });
      document.addEventListener('drop', handleDrop, { passive: false });
      document.addEventListener('dragover', handleDragOver, { passive: false });
      
      // Specific image protection
      images = document.querySelectorAll('img');
      if (images) {
        images.forEach(img => {
          img.addEventListener('contextmenu', handleImageContextMenu, { passive: false });
          img.addEventListener('dragstart', handleDragStart, { passive: false });
        });
      }
    }

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('selectstart', handleSelectStart);
        document.removeEventListener('dragstart', handleDragStart);
        document.removeEventListener('drop', handleDrop);
        document.removeEventListener('dragover', handleDragOver);
        
        if (images) {
          images.forEach(img => {
            img.removeEventListener('contextmenu', handleImageContextMenu);
            img.removeEventListener('dragstart', handleDragStart);
          });
        }
      }
      
      if (devToolsInterval) {
        clearInterval(devToolsInterval);
      }
    };
  }, [
    onSecurityViolation,
    blockRightClick,
    blockKeyboardShortcuts,
    blockTextSelection,
    blockDragAndDrop,
    detectDevTools,
    blockPrintScreen
  ]);

  return { reportViolation: onSecurityViolation };
}

// CSS styles to enhance security (to be added to global CSS)
export const securityStyles = `
  /* Disable text selection globally when needed */
  .no-select {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Disable drag for images */
  .no-drag {
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
    pointer-events: none;
  }

  /* Hide scrollbars to prevent right-click on them */
  .secure-pdf-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .secure-pdf-container::-webkit-scrollbar {
    display: none;
  }

  /* Prevent highlighting */
  .secure-content {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Additional protection for print media */
  @media print {
    .no-print {
      display: none !important;
    }
  }

  /* Blur content when dev tools are detected */
  .security-blur {
    filter: blur(5px);
    pointer-events: none;
  }
`;

export default useSecurityMeasures;