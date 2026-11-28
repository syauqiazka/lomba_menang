import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRegionDetail, getRegenciesForProvince } from '@/lib/map-data';

const regionCodeSchema = z
  .string()
  .regex(/^\d{2}(\d{2})?$/, 'Kode wilayah harus 2 atau 4 digit angka BPS');

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const parsed = regionCodeSchema.safeParse(code);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REGION_CODE',
            message: 'Kode wilayah BPS tidak valid.',
          },
        },
        { status: 400 }
      );
    }

    const validCode = parsed.data;
    const region = await getRegionDetail(validCode);

    if (!region) {
      return NextResponse.json(
        {
          error: {
            code: 'REGION_NOT_FOUND',
            message: 'Wilayah tidak ditemukan.',
          },
        },
        { status: 404 }
      );
    }

    if (validCode.length === 2) {
      const regencies = await getRegenciesForProvince(validCode);
      return NextResponse.json({ region, regencies });
    }

    return NextResponse.json({ region });
  } catch (error) {
    console.error('Failed to fetch map region detail:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Gagal memuat detail wilayah. Silakan coba lagi.',
        },
      },
      { status: 500 }
    );
  }
}
