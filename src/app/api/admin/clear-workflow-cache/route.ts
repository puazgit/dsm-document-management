import { NextResponse } from 'next/server';
import { clearWorkflowCache } from '@/config/document-workflow';

export async function POST() {
  try {
    clearWorkflowCache();
    
    return NextResponse.json({ 
      success: true,
      message: 'Workflow cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing workflow cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear workflow cache' },
      { status: 500 }
    );
  }
}
