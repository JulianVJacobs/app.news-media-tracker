import { NextResponse } from 'next/server';
import { get, post, put, del } from './offline';

export async function GET(request: Request) {
  const result = await get(request);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const result = await post(request);
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const result = await put(request);
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const result = await del(request);
  return NextResponse.json(result);
}
