import { NextRequest, NextResponse } from 'next/server';
import { pensionOrderExists, insertPensionRound, getPensionRoundsCount } from '@/lib/pensionSupabaseUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { newData } = body;

    if (!Array.isArray(newData) || newData.length !== 14) {
      return NextResponse.json(
        { error: '데이터는 14개의 숫자 배열이어야 합니다.' },
        { status: 400 }
      );
    }

    if (!newData.every(item => typeof item === 'number')) {
      return NextResponse.json(
        { error: '모든 요소는 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    const exists = await pensionOrderExists(newData[0]);
    if (exists) {
      return NextResponse.json(
        { error: `회차 ${newData[0]}번이 이미 존재합니다.` },
        { status: 400 }
      );
    }

    await insertPensionRound(newData);
    const totalCount = await getPensionRoundsCount();

    return NextResponse.json({
      success: true,
      message: `회차 ${newData[0]}번 데이터가 추가되었습니다.`,
      totalCount
    });
  } catch (error) {
    console.error('데이터 추가 실패:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
