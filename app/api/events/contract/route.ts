import { NextResponse } from 'next/server';
import { EVENTS_CONTRACT } from '../../../../lib/contracts/events-contract';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: EVENTS_CONTRACT,
  });
}
