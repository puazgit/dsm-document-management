// PDF.js configuration and worker setup
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker from CDN (most reliable)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

export { pdfjs };