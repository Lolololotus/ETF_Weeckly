import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 서버 사이드에서 안전하게 .env.local 혹은 환경 변수의 YOUTUBE_API_KEY를 조회
    const apiKey = process.env.YOUTUBE_API_KEY || '';
    
    if (!apiKey) {
      console.warn("[Dashboard API] YOUTUBE_API_KEY 환경변수가 존재하지 않아 가데이터를 반환합니다.");
    }
    
    const data = await getDashboardData(apiKey);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Dashboard API] 에러 발생:", error);
    return NextResponse.json(
      { error: "유튜브 데이터를 가져오는 중 서버 에러가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
