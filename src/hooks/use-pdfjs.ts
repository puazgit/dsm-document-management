'use client';

import { useEffect, useState } from 'react';

export function usePDFJS() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Dynamic import PDF.js only on client side
    const loadPDFJS = async () => {
      try {
        const { pdfjs } = await import('react-pdf');
        
        // Configure worker only if not already configured
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Failed to load PDF.js:', error);
      }
    };

    loadPDFJS();
  }, []);

  return { isReady };
}

export default usePDFJS;