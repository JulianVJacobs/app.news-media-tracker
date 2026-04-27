import { NextResponse } from 'next/server';
import { PARTICIPANT_MERGE_CONTRACT } from '../../../../lib/contracts/participant-merge';

/**
 * GET /api/participants/contract - publishes the frozen participant merge contract
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: PARTICIPANT_MERGE_CONTRACT,
  });
}

