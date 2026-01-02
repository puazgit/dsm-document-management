/**
 * PDF Text Extraction Service
 * Extracts text content and metadata from PDF files
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Import pdf-parse (CommonJS default export)
const pdfParse = require('pdf-parse')

export interface PdfExtractionResult {
  text: string
  pages: number
  metadata?: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
    keywords?: string[]
  }
  info?: Record<string, any>
}

export interface PdfExtractionError {
  error: string
  message: string
  filePath: string
}

/**
 * Extract text content from a PDF file
 * @param filePath - Absolute or relative path to the PDF file
 * @returns Extracted text content
 */
export async function extractPdfText(filePath: string): Promise<string> {
  try {
    const result = await extractPdfContent(filePath)
    return result.text
  } catch (error) {
    console.error(`PDF text extraction error for ${filePath}:`, error)
    throw error
  }
}

/**
 * Extract text content and metadata from a PDF file
 * @param filePath - Absolute or relative path to the PDF file
 * @returns Complete extraction result with text, metadata, and page count
 */
export async function extractPdfContent(
  filePath: string
): Promise<PdfExtractionResult> {
  try {
    // Check if file exists
    const absolutePath = filePath.startsWith('/') || filePath.match(/^[A-Za-z]:/)
      ? filePath
      : join(process.cwd(), filePath)

    if (!existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`)
    }

    // Read the PDF file
    const dataBuffer = await readFile(absolutePath)

    // Parse PDF
    const data = await pdfParse(dataBuffer, {
      // Disable page rendering to speed up text extraction
      max: 0, // Extract all pages (0 = no limit)
    })

    // Extract and clean text
    const cleanedText = cleanText(data.text)

    // Parse metadata
    const metadata = parseMetadata(data.info, data.metadata)

    return {
      text: cleanedText,
      pages: data.numpages,
      metadata,
      info: data.info,
    }
  } catch (error: any) {
    console.error(`PDF content extraction error for ${filePath}:`, error)
    
    // Return a more descriptive error
    const errorResult: PdfExtractionError = {
      error: 'PDF_EXTRACTION_FAILED',
      message: error.message || 'Unknown error during PDF extraction',
      filePath,
    }
    
    throw errorResult
  }
}

/**
 * Clean and normalize extracted text
 * Removes excessive whitespace, normalizes line breaks, etc.
 */
function cleanText(text: string): string {
  if (!text) return ''

  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove excessive line breaks (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Trim the entire text
    .trim()
}

/**
 * Parse PDF metadata into a structured format
 */
function parseMetadata(
  info?: Record<string, any>,
  metadata?: Record<string, any>
): PdfExtractionResult['metadata'] {
  if (!info && !metadata) return undefined

  const result: PdfExtractionResult['metadata'] = {}

  // Merge info and metadata
  const combined = { ...metadata, ...info }

  // Extract common fields
  if (combined.Title) result.title = String(combined.Title)
  if (combined.Author) result.author = String(combined.Author)
  if (combined.Subject) result.subject = String(combined.Subject)
  if (combined.Creator) result.creator = String(combined.Creator)
  if (combined.Producer) result.producer = String(combined.Producer)

  // Parse dates
  if (combined.CreationDate) {
    result.creationDate = parseDate(combined.CreationDate)
  }
  if (combined.ModDate) {
    result.modificationDate = parseDate(combined.ModDate)
  }

  // Parse keywords
  if (combined.Keywords) {
    const keywords = String(combined.Keywords)
    result.keywords = keywords
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
  }

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSS)
 */
function parseDate(dateString: string): Date | undefined {
  try {
    if (!dateString) return undefined

    // PDF date format: D:YYYYMMDDHHmmSS+HH'mm'
    const match = dateString.match(
      /D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/
    )

    if (match) {
      const [, year, month, day, hour, minute, second] = match
      return new Date(
        parseInt(year || '0'),
        parseInt(month || '0') - 1,
        parseInt(day || '0'),
        parseInt(hour || '0'),
        parseInt(minute || '0'),
        parseInt(second || '0')
      )
    }

    // Try standard date parsing as fallback
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? undefined : date
  } catch {
    return undefined
  }
}

/**
 * Check if a file is a PDF based on its mime type or extension
 */
export function isPdfFile(mimeType?: string, fileName?: string): boolean {
  if (mimeType && mimeType === 'application/pdf') return true
  if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true
  return false
}

/**
 * Estimate extraction time based on file size
 * Returns estimated seconds
 */
export function estimateExtractionTime(fileSizeBytes: number): number {
  // Very rough estimate: ~1 second per MB
  const fileSizeMB = fileSizeBytes / (1024 * 1024)
  return Math.max(1, Math.ceil(fileSizeMB))
}

/**
 * Validate if text extraction was successful
 * Returns true if text contains meaningful content
 */
export function isExtractionSuccessful(text: string, minLength = 10): boolean {
  if (!text) return false
  const cleanedText = text.trim()
  return cleanedText.length >= minLength
}
