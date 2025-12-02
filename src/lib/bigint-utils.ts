/**
 * Utility function to convert BigInt values to Numbers for JSON serialization
 * This solves the "TypeError: Do not know how to serialize a BigInt" error
 * that occurs when Prisma returns BigInt values from database operations
 */

export function convertBigIntToNumber(value: any): any {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  
  if (Array.isArray(value)) {
    return value.map(convertBigIntToNumber);
  }
  
  if (value && typeof value === 'object' && value.constructor === Object) {
    const converted: any = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertBigIntToNumber(val);
    }
    return converted;
  }
  
  return value;
}

/**
 * Utility function to safely serialize response data
 * Handles BigInt conversion and returns a clean object for NextResponse.json()
 */
export function serializeForResponse(data: any): any {
  try {
    // First convert BigInt values
    const converted = convertBigIntToNumber(data);
    
    // Test if it can be serialized
    JSON.stringify(converted);
    
    return converted;
  } catch (error) {
    console.error('Serialization error:', error);
    throw new Error('Failed to serialize response data');
  }
}