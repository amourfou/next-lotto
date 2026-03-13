import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    const filePath = path.join(process.cwd(), 'public', 'PensionLottery.json');
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const existingOrder = existingData.find((row: number[]) => row[0] === newData[0]);
    if (existingOrder) {
      return NextResponse.json(
        { error: `회차 ${newData[0]}번이 이미 존재합니다.` },
        { status: 400 }
      );
    }

    existingData.unshift(newData);
    existingData.sort((a: number[], b: number[]) => b[0] - a[0]);

    const formatJSON = (data: number[][]): string => {
      const lines = data.map((row, index) => {
        const numbersStr = row.map(num => num.toString()).join(', ');
        const formattedRow = `[ ${numbersStr} ]`;
        return index === data.length - 1 ? `  ${formattedRow}` : `  ${formattedRow},`;
      });
      return `[\n${lines.join('\n')}\n]`;
    };

    fs.writeFileSync(filePath, formatJSON(existingData), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `회차 ${newData[0]}번 데이터가 추가되었습니다.`,
      totalCount: existingData.length
    });
  } catch (error) {
    console.error('데이터 추가 실패:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
