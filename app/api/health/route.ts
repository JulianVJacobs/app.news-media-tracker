import { NextResponse } from 'next/server';

/**
 * Health check endpoint for the Homicide Media Tracker API
 * This demonstrates that the standalone server is working correctly
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Homicide Media Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
}
