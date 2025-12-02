'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PDFDownloadTest() {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testDownload = async () => {
    setIsLoading(true);
    setTestResult('Testing...');

    try {
      // Environment check
      console.log('Environment Check:');
      console.log('- typeof window:', typeof window);
      console.log('- typeof document:', typeof document);
      
      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment');
      }

      // Test document.createElement
      const testLink = document.createElement('a');
      console.log('✅ document.createElement works:', testLink.tagName);

      // Test blob creation and download
      const testContent = 'Test PDF download functionality\nTimestamp: ' + new Date().toISOString();
      const blob = new Blob([testContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);

      testLink.href = url;
      testLink.download = 'test-download.txt';
      testLink.style.display = 'none';
      
      document.body.appendChild(testLink);
      testLink.click();
      document.body.removeChild(testLink);
      
      window.URL.revokeObjectURL(url);

      setTestResult('✅ Test download successful! Check your Downloads folder for test-download.txt');
      console.log('✅ PDF download test passed');
      
    } catch (error) {
      const errorMsg = `❌ Test failed: ${error instanceof Error ? error.message : String(error)}`;
      setTestResult(errorMsg);
      console.error('❌ PDF download test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testModalDownload = () => {
    setIsLoading(true);
    setTestResult('Testing modal PDF download simulation...');

    try {
      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment');
      }

      // Simulate the exact process used in modal PDF download
      const testContent = 'Modal PDF Test Content\nTimestamp: ' + new Date().toISOString();
      const blob = new Blob([testContent], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Use the same pattern as in pdf-viewer.tsx
      const browserDocument = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : null;
      if (!browserDocument) {
        throw new Error('Browser document not available');
      }

      const a = browserDocument.createElement('a');
      a.href = url;
      a.download = 'modal-test.pdf';
      browserDocument.body.appendChild(a);
      a.click();
      browserDocument.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setTestResult('✅ Modal download test successful! This means the modal PDF download should work.');
      console.log('✅ Modal PDF download test passed');
      
    } catch (error) {
      const errorMsg = `❌ Modal test failed: ${error instanceof Error ? error.message : String(error)}`;
      setTestResult(errorMsg);
      console.error('❌ Modal PDF download test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testRealPDFDownload = async () => {
    setIsLoading(true);
    setTestResult('Testing real PDF download...');

    try {
      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment');
      }

      // Test with a real document from the API
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      const pdfDoc = data.documents?.find((doc: any) => doc.fileName.toLowerCase().endsWith('.pdf'));
      
      if (!pdfDoc) {
        throw new Error('No PDF documents found in database');
      }

      console.log('Testing with document:', pdfDoc.fileName);

      // Try to download the actual PDF
      const downloadResponse = await fetch(`/api/documents/${pdfDoc.id}/download`);
      if (!downloadResponse.ok) {
        throw new Error(`Download API failed: ${downloadResponse.status}`);
      }

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = pdfDoc.fileName;
      downloadLink.style.display = 'none';
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      window.URL.revokeObjectURL(url);

      setTestResult(`✅ Real PDF download successful! Downloaded: ${pdfDoc.fileName}`);
      console.log('✅ Real PDF download test passed');
      
    } catch (error) {
      const errorMsg = `❌ Real PDF test failed: ${error instanceof Error ? error.message : String(error)}`;
      setTestResult(errorMsg);
      console.error('❌ Real PDF download test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 PDF Download Functionality Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Button 
            onClick={testDownload}
            disabled={isLoading}
            variant="outline"
          >
            Test Basic Download
          </Button>

          <Button 
            onClick={testModalDownload}
            disabled={isLoading}
            variant="secondary"
          >
            Test Modal Download
          </Button>
          
          <Button 
            onClick={testRealPDFDownload}
            disabled={isLoading}
            variant="default"
          >
            Test Real PDF Download
          </Button>
        </div>
        
        {testResult && (
          <div className={`p-4 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {testResult}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Test Basic Download" to test document.createElement functionality</li>
            <li>Click "Test Modal Download" to simulate the exact modal PDF download process</li>
            <li>Click "Test Real PDF Download" to test with actual database documents</li>
            <li>Then test the actual modal: Click a PDF document → Preview → Download PDF button</li>
            <li>Check browser console for detailed logs and Downloads folder for files</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}