import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDisasterTrends } from '@/lib/trends-data';
import type { TrendCategory, TrendRange } from '@/types/trends';

const QuerySchema = z.object({
  category: z
    .enum(['ALL', 'FLOOD', 'LANDSLIDE', 'EARTHQUAKE', 'EXTREME_WEATHER', 'VOLCANO', 'OTHER'])
    .optional(),
  range: z.enum(['7', '30', '90', '365']).optional(),
});

export async function GET(request: NextRequest) {
  const rawParams = {
    category: request.nextUrl.searchParams.get('category') ?? undefined,
    range: request.nextUrl.searchParams.get('range') ?? undefined,
  };

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parameter kategori atau rentang hari tidak valid.' },
      { status: 400 }
    );
  }

  const category = (parsed.data.category ?? 'ALL') as TrendCategory;
  const rangeDays = Number.parseInt(parsed.data.range ?? '30', 10) as TrendRange;

  try {
    const data = await getDisasterTrends({ category, rangeDays });
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error computing disaster trends:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data tren bencana.' },
      { status: 500 }
    );
  }
}
