/**
 * Unit Tests for SecurePDFViewer Component
 * 
 * Test Coverage:
 * - Permission loading and fallback logic
 * - Role-based access control
 * - Download functionality
 * - Security features (watermark, right-click prevention)
 * - Accessibility features
 * 
 * To run tests: npm test or jest
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import '@testing-library/jest-dom';
import { SecurePDFViewer } from '../pdf-viewer';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SecurePDFViewer', () => {
  const mockProps = {
    fileUrl: '/api/documents/123/download',
    fileName: 'test-document.pdf',
    userRole: 'viewer',
    canDownload: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Loading', () => {
    it('should load permissions from session when available', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: {
          user: {
            role: 'editor',
            permissions: ['pdf.download', 'pdf.print'],
          },
        },
        status: 'authenticated',
      });

      render(<SecurePDFViewer {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Download/)).toBeInTheDocument();
      });
    });

    it('should fall back to API when session has no permissions', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: { user: { role: 'viewer' } },
        status: 'authenticated',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          canDownload: true,
          canPrint: true,
          canCopy: false,
          showWatermark: true,
        }),
      });

      render(<SecurePDFViewer {...mockProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/roles/viewer/permissions-summary')
        );
      });
    });

    it('should use default permissions when all else fails', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      render(<SecurePDFViewer {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Download/)).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should show download button for users with download permission', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: {
          user: {
            role: 'admin',
            permissions: ['pdf.download'],
          },
        },
        status: 'authenticated',
      });

      render(<SecurePDFViewer {...mockProps} canDownload={true} />);

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
      });
    });

    it('should hide download button for users without download permission', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: {
          user: {
            role: 'guest',
            permissions: [],
          },
        },
        status: 'authenticated',
      });

      render(<SecurePDFViewer {...mockProps} canDownload={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
      });
    });

    it('should show watermark for roles without watermark permission', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: {
          user: {
            role: 'reviewer',
            permissions: [],
          },
        },
        status: 'authenticated',
      });

      render(<SecurePDFViewer {...mockProps} userRole="reviewer" />);

      await waitFor(() => {
        expect(screen.getByText(/Watermarked/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('should prevent right-click on PDF viewer', () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const { container } = render(<SecurePDFViewer {...mockProps} />);
      const viewer = container.querySelector('.pdf-viewer-restricted');

      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(contextMenuEvent, 'preventDefault');

      viewer?.dispatchEvent(contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should sanitize filename to prevent XSS', () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const maliciousFileName = '<script>alert("xss")</script>test.pdf';
      
      render(<SecurePDFViewer {...mockProps} fileName={maliciousFileName} />);

      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should trigger download when button is clicked', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: {
          user: {
            role: 'admin',
            permissions: ['pdf.download'],
          },
        },
        status: 'authenticated',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['pdf content'], { type: 'application/pdf' }),
      });

      const createElementSpy = jest.spyOn(document, 'createElement');

      render(<SecurePDFViewer {...mockProps} canDownload={true} />);

      await waitFor(() => {
        const downloadButton = screen.getByText('Download PDF');
        fireEvent.click(downloadButton);
      });

      await waitFor(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
      });
    });

    it('should not allow download if permission is denied', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: {
          user: {
            role: 'guest',
            permissions: [],
          },
        },
        status: 'authenticated',
      });

      render(<SecurePDFViewer {...mockProps} canDownload={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      render(<SecurePDFViewer {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('PDF Document Viewer')).toBeInTheDocument();
      });
    });

    it('should announce loading state to screen readers', () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      render(<SecurePDFViewer {...mockProps} />);

      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when PDF fails to load', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      render(<SecurePDFViewer {...mockProps} />);

      const iframe = screen.getByTitle('test-document.pdf');
      fireEvent.error(iframe);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load PDF/i)).toBeInTheDocument();
      });
    });

    it('should show fallback UI for non-PDF files', () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      render(<SecurePDFViewer {...mockProps} fileName="document.docx" />);

      expect(screen.getByText(/Preview not available/i)).toBeInTheDocument();
    });
  });
});

/**
 * Integration Tests for Permission API
 */
describe('Permission API Integration', () => {
  it('should fetch permissions from correct API endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        canDownload: true,
        canPrint: true,
        canCopy: true,
        showWatermark: false,
      }),
    });

    const { useSession } = require('next-auth/react');
    useSession.mockReturnValue({
      data: { user: { role: 'manager' } },
      status: 'authenticated',
    });

    render(<SecurePDFViewer {...mockProps} userRole="manager" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/roles/manager/permissions-summary')
      );
    });
  });
});
