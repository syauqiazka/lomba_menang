import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBmkgRealtimeEarthquakes } from '@/lib/bmkg-realtime';

const QuerySchema = z.object({
  refresh: z.enum(['0', '1']).optional(),
});

export async function GET(request: NextRequest) {
  const rawParams = {
    refresh: request.nextUrl.searchParams.get('refresh') ?? undefined,
  };

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parameter refresh tidak valid.' },
      { status: 400 }
    );
  }

  try {
    const result = await getBmkgRealtimeEarthquakes({
      forceRefresh: parsed.data.refresh === '1',
    });

    return NextResponse.json(result.response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching BMKG InaTEWS realtime earthquakes:', error);
    return NextResponse.json(
      { error: 'Gagal memuat feed gempa realtime BMKG InaTEWS saat ini.' },
      { status: 500 }
    );
  }
}
