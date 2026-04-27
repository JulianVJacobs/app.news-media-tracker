import { NextResponse } from 'next/server';
import { PARTICIPANT_FORM_CONTRACT } from '../../../../../lib/contracts/participant-form';

/**
 * GET /api/participants/form-contract - publishes the participant form contract
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: PARTICIPANT_FORM_CONTRACT,
  });
}
