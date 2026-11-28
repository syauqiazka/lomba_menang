import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDisasterIncidentsFeed } from '@/lib/live-incidents';
import type { IncidentCategory, IncidentsFeedResponse } from '@/types/map';

const QuerySchema = z.object({
  category: z
    .enum(['ALL', 'FLOOD', 'LANDSLIDE', 'EARTHQUAKE', 'EXTREME_WEATHER', 'VOLCANO', 'OTHER'])
    .optional(),
  refresh: z.enum(['0', '1']).optional(),
});

const REFRESH_COOLDOWN_MS = 10_000;
let lastForcedRefreshAt = 0;
let lastRefreshCache: IncidentsFeedResponse | null = null;

export async function GET(request: NextRequest) {
  const rawParams = {
    category: request.nextUrl.searchParams.get('category') ?? undefined,
    refresh: request.nextUrl.searchParams.get('refresh') ?? undefined,
  };

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parameter kategori atau refresh tidak valid.' },
      { status: 400 }
    );
  }

  const { category = 'ALL', refresh } = parsed.data;
  const wantsForce = refresh === '1';

  try {
    const now = Date.now();
    if (wantsForce && lastRefreshCache && now - lastForcedRefreshAt < REFRESH_COOLDOWN_MS) {
      const incidents =
        category === 'ALL'
          ? lastRefreshCache.incidents
          : lastRefreshCache.incidents.filter((i) => i.category === category);
      return NextResponse.json(
        { ...lastRefreshCache, incidents },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const feed = await getDisasterIncidentsFeed({
      forceRefresh: wantsForce,
      category: category as IncidentCategory | 'ALL',
    });

    if (wantsForce && category === 'ALL') {
      lastForcedRefreshAt = now;
      lastRefreshCache = feed;
    }

    return NextResponse.json(feed, {
      headers: {
        'Cache-Control': wantsForce
          ? 'no-store'
          : 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching disaster incidents feed:', error);
    return NextResponse.json(
      { error: 'Gagal memuat feed titik bencana resmi saat ini.' },
      { status: 500 }
    );
  }
}
