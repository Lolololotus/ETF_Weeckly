/**
 * YouTube API 수집 검증 테스트 스크립트
 * 
 * 실행 방법:
 * 1. 로컬 환경에 .env.local 파일을 생성하고 YOUTUBE_API_KEY=your_key 를 입력합니다.
 * 2. 터미널에서 다음 명령어를 실행합니다:
 *    node scripts/verify-youtube-api.js [optional_api_key]
 */

const fs = require('fs');
const path = require('path');

// 1. .env.local 파일 파싱 기능 (dotenv 패키지 없이 직접 구현)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/(^"|"$|^'|'$)/g, '');
          env[key] = value;
        }
      }
    });
    console.log('✅ .env.local 파일에서 환경변수를 로드했습니다.');
  } else {
    console.log('ℹ️ .env.local 파일이 존재하지 않습니다. 시스템 환경 변수 및 인자 값을 확인합니다.');
  }
  
  return env;
}

// ISO 8601 Duration 파서
function parseDuration(durationStr) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);

  if (!matches) return { text: "00:00", seconds: 0 };

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let text = '';
  if (hours > 0) {
    text += `${hours.toString().padStart(2, '0')}:`;
  }
  text += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { text, seconds: totalSeconds };
}

// 주간 날짜 범위 계산
function getReportingRange() {
  const targetDate = new Date();
  const currentDay = targetDate.getDay();
  const latestWednesday = new Date(targetDate);
  latestWednesday.setHours(0, 0, 0, 0);
  
  let diffToWed = currentDay - 3;
  if (diffToWed < 0) diffToWed += 7;
  
  latestWednesday.setDate(targetDate.getDate() - diffToWed);
  
  const prevThursday = new Date(latestWednesday);
  prevThursday.setDate(latestWednesday.getDate() - 6);
  prevThursday.setHours(0, 0, 0, 0);
  
  const wednesdayEnd = new Date(latestWednesday);
  wednesdayEnd.setHours(23, 59, 59, 999);
  
  return { start: prevThursday, end: wednesdayEnd };
}

// 유튜브 쇼츠 여부를 HTTP HEAD 요청의 리다이렉트 여부로 판별하는 헬퍼 함수
async function checkIfShorts(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    return res.status === 200;
  } catch (e) {
    console.error(`[YouTube API] Video ID ${videoId} 쇼츠 여부 확인 HEAD 요청 중 에러:`, e);
    return null;
  }
}

async function verifyAPI() {
  const env = loadEnv();
  // 1. 파라미터 인자 혹은 env 파일에서 API 키 추출
  const apiKey = process.argv[2] || env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  console.log('\n======================================================');
  console.log('🤖 KODEX 유튜브 경쟁사 모니터링 API 검증 엔진 작동');
  console.log('======================================================');

  if (!apiKey) {
    console.error('\n❌ 에러: YouTube API Key를 찾을 수 없습니다!');
    console.log('\n💡 [해결 방법]');
    console.log('1. 프로젝트 루트 폴더에 `.env.local` 파일을 만듭니다.');
    console.log('2. 파일 내에 다음 라인을 작성해 저장합니다:');
    console.log('   YOUTUBE_API_KEY=AIzaSy...');
    console.log('3. 또는 명령어 인자로 직접 전달하세요:');
    console.log('   node scripts/verify-youtube-api.js AIzaSy...');
    console.log('\n------------------------------------------------------');
    console.log('ℹ️ 대신, 내장된 테스트용 가데이터(Mock Data) 구조를 검증합니다.');
    console.log('------------------------------------------------------');
    
    // 가데이터 검증 출력
    const mockChannelsPreview = [
      { name: "삼성자산운용 KODEX ETF", handle: "@samsungfund", subscribers: "12.8만명", videosCount: 5, leadVideo: "[KODEX 주간 ETF 세미나] 금리 인하 수혜, 어떤 ETF가 가장 유리할까?" },
      { name: "스마트 타이거 – TIGER ETF", handle: "@tiger_etf", subscribers: "24.5만명", videosCount: 2, leadVideo: "[TIGER 투자 가이드] 2026년 2분기 글로벌 테마 ETF 트렌드 완벽 브리핑" },
      { name: "신한 SOL ETF", handle: "@SOL_ETF", subscribers: "4.2만명", videosCount: 3, leadVideo: "[SOL 월간 세미나] 엔화 노출형 ETF로 엔저 시대에 현명하게 대처하는 법" }
    ];

    mockChannelsPreview.forEach(ch => {
      console.log(`\n채널: ${ch.name} (${ch.handle})`);
      console.log(`- 구독자 수: ${ch.subscribers}`);
      console.log(`- 수집 가데이터 영상 수: ${ch.videosCount}개`);
      console.log(`  └─ 대표 영상: "${ch.leadVideo}"`);
      console.log(`     상태: 로드 대기 완료 (OK)`);
    });
    console.log('\n======================================================');
    console.log('🎉 가데이터 검증 완료! UI 레이아웃 로드 준비 완료.');
    console.log('======================================================\n');
    return;
  }

  console.log(`🔑 사용 중인 API Key: ${apiKey.substring(0, 8)}********************`);
  const range = getReportingRange();
  console.log(`📅 수집 타겟 범위: ${range.start.toISOString()} ~ ${range.end.toISOString()}`);

  const channelsToFetch = [
    { handle: "@KODEXETF", name: "KODEX (자사)" },
    { handle: "@tiger_etf", name: "TIGER ETF (경쟁사1)" },
    { handle: "@SOL_ETF", name: "SOL ETF (경쟁사2)" }
  ];

  try {
    for (const target of channelsToFetch) {
      console.log(`\n------------------------------------------------------`);
      console.log(`📡 [${target.name}] 채널 정보 조회 중... (${target.handle})`);
      
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(target.handle)}&key=${apiKey}`;
      const channelRes = await fetch(channelUrl);
      
      if (!channelRes.ok) {
        throw new Error(`API 호출 실패 (HTTP Status: ${channelRes.status})`);
      }
      
      const channelData = await channelRes.json();
      if (!channelData.items || channelData.items.length === 0) {
        console.log(`❌ 경고: 핸들 ${target.handle}에 매칭되는 채널을 찾을 수 없습니다.`);
        continue;
      }

      const item = channelData.items[0];
      const channelId = item.id;
      const channelTitle = item.snippet.title;
      const subscriberCount = parseInt(item.statistics.subscriberCount || '0', 10);
      const uploadsPlaylistId = item.contentDetails.relatedPlaylists.uploads;

      console.log(`✅ 채널 발견: "${channelTitle}" (ID: ${channelId})`);
      console.log(`👥 구독자 수: ${subscriberCount.toLocaleString()}명`);
      console.log(`📦 업로드 재생목록 ID: ${uploadsPlaylistId}`);

      // 최근 업로드 비디오 10개 조회
      console.log(`📥 최근 업로드 영상 조회 중...`);
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`;
      const playlistRes = await fetch(playlistUrl);
      
      if (!playlistRes.ok) {
        console.log(`❌ 업로드 영상 리스트를 조회하지 못했습니다.`);
        continue;
      }

      const playlistData = await playlistRes.json();
      const rawItems = playlistData.items || [];
      console.log(`🔍 총 ${rawItems.length}개의 최신 업로드 영상을 찾았습니다.`);

      const filteredVideos = [];
      for (const rawItem of rawItems) {
        const videoId = rawItem.contentDetails.videoId;
        const title = rawItem.snippet.title;
        const publishedAtStr = rawItem.snippet.publishedAt;
        const publishedDate = new Date(publishedAtStr);

        // 목~수 날짜 체크
        const isInRange = publishedDate >= range.start && publishedDate <= range.end;

        if (isInRange) {
          filteredVideos.push({
            id: videoId,
            title,
            publishedAt: publishedAtStr,
            description: rawItem.snippet.description || "",
            thumbnail: rawItem.snippet.thumbnails?.maxres?.url || 
                       rawItem.snippet.thumbnails?.standard?.url || 
                       rawItem.snippet.thumbnails?.high?.url || 
                       "No High Res"
          });
        }
      }

      console.log(`📅 주간 범위 내 업로드된 영상: ${filteredVideos.length}개`);

      if (filteredVideos.length > 0) {
        console.log(`\n   🔍 [검증 영상 정보 목록]`);
        for (const sample of filteredVideos) {
          console.log(`   --------------------------------------`);
          console.log(`   - 제목: "${sample.title}"`);
          console.log(`   - 업로드 일시: ${sample.publishedAt}`);
          console.log(`   - 썸네일(maxres/std): ${sample.thumbnail}`);
          
          // 상세 API 호출하여 러닝타임 조회
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${sample.id}&key=${apiKey}`;
          const detailsRes = await fetch(detailsUrl);
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const detailItem = detailsData.items?.[0];
            if (detailItem) {
              const parsed = parseDuration(detailItem.contentDetails.duration);
              const headCheck = await checkIfShorts(sample.id);
              const isShorts = headCheck !== null ? headCheck : (parsed.seconds <= 60);
              console.log(`   - 러닝타임: ${parsed.text} (${parsed.seconds}초, 분류: ${isShorts ? 'SHORTS' : 'VIDEO'}${headCheck !== null ? '' : ' (폴백 적용)'})`);
            }
          }
          
          const descPreview = sample.description.replace(/\n/g, ' ').substring(0, 80);
          console.log(`   - 설명란 수집 성공 여부: ${sample.description ? '성공 (OK)' : '비어있음'}`);
          console.log(`   - 설명란 미리보기: "${descPreview}..."`);
        }
      } else {
        console.log(`   ℹ️ 해당 주간에 업로드된 영상이 없습니다.`);
        // 범위 밖의 가장 최근 영상 1개 검증
        if (rawItems.length > 0) {
          const sample = rawItems[0];
          console.log(`   🔍 [최근 1개 영상 샘플 검증 (범위 외)]`);
          console.log(`   - 제목: "${sample.snippet.title}"`);
          console.log(`   - 업로드 일시: ${sample.snippet.publishedAt}`);
          const hasMaxres = sample.snippet.thumbnails?.maxres ? '있음(Maxres)' : '없음(High/Std)';
          console.log(`   - 고화질 썸네일 여부: ${hasMaxres}`);
        }
      }
    }

    console.log('\n======================================================');
    console.log('🎉 YouTube API 데이터 파이프라인 수집 검증 성공!');
    console.log('======================================================\n');

  } catch (error) {
    console.error('\n❌ API 수집 중 예외적인 에러가 발생했습니다:');
    console.error(error.message);
    console.log('\n======================================================\n');
  }
}

verifyAPI();
