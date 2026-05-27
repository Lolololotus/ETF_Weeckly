import { MOCK_CHANNELS, ChannelInfo, VideoItem } from './mockData';

// ISO 8601 Duration 파서 (예: PT1H2M30S -> "01:02:30", 3750초)
export function parseISODuration(durationStr: string): { text: string; seconds: number } {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);

  if (!matches) {
    return { text: "00:00", seconds: 0 };
  }

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

// 리포팅 주간 날짜 범위 계산 (전주 목요일 00:00:00 ~ 이번 주 수요일 23:59:59)
// 매주 수요일 자정 갱신이므로, 특정 타겟 날짜(디폴트는 오늘) 기준 가장 최근 수요일을 갱신일로 보고 그 주간 범위를 반환.
export function getReportingRange(targetDate: Date = new Date()) {
  const currentDay = targetDate.getDay(); // 0: 일요일, 1: 월요일, ..., 3: 수요일, ..., 6: 토요일
  
  // 가장 최근 수요일 구하기
  const latestWednesday = new Date(targetDate);
  latestWednesday.setHours(0, 0, 0, 0);
  
  // 만약 오늘이 목, 금, 토, 일, 월, 화 라면 이번 주 수요일 혹은 지난주 수요일
  // 수요일 자정 갱신이므로 수요일 당일이라면 오늘 자정이 갱신일임.
  // 5월 21일 목요일 기준 가장 최근 갱신일은 5월 20일 수요일 00:00:00
  let diffToWed = currentDay - 3;
  if (diffToWed < 0) {
    diffToWed += 7; // 지난 주 수요일
  }
  
  latestWednesday.setDate(targetDate.getDate() - diffToWed);
  
  // 수요일 기준 전주 목요일 (수요일에서 6일 전)
  const prevThursday = new Date(latestWednesday);
  prevThursday.setDate(latestWednesday.getDate() - 6);
  prevThursday.setHours(0, 0, 0, 0);
  
  // 이번 주 수요일 23:59:59 (latestWednesday 당일의 끝)
  const wednesdayEnd = new Date(latestWednesday);
  wednesdayEnd.setHours(23, 59, 59, 999);
  
  return {
    start: prevThursday,
    end: wednesdayEnd,
    formattedStart: prevThursday.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    formattedEnd: wednesdayEnd.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  };
}

const CHANNELS_TO_FETCH = [
  { handle: "@KODEXETF", isCompany: true },
  { handle: "@tiger_etf", isCompany: false },
  { handle: "@SOL_ETF", isCompany: false }
];

export async function getDashboardData(apiKey?: string): Promise<{ channels: ChannelInfo[]; reportingRange: string; isMock: boolean }> {
  const activeKey = apiKey || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const range = getReportingRange();
  const rangeText = `${range.formattedStart} ~ ${range.formattedEnd}`;

  // 넉넉하게 최근 35일(5주) 전부터의 모든 최신 업로드 영상을 API 수준에서 수집하여, 
  // 클라이언트 단에서 "이번 주"뿐만 아니라 "지난주", "2주 전" 등 과거 주간 데이터를 누락 없이 정확하게 볼 수 있도록 조치합니다.
  const collectStartDate = new Date();
  collectStartDate.setDate(collectStartDate.getDate() - 35);
  collectStartDate.setHours(0, 0, 0, 0);

  if (!activeKey) {
    console.log("[YouTube API] API Key가 제공되지 않아 가데이터(Mock Data)를 사용합니다.");
    return {
      channels: MOCK_CHANNELS,
      reportingRange: rangeText,
      isMock: true
    };
  }

  try {
    console.log("[YouTube API] API Key를 감지하여 유튜브 실시간 데이터를 요청합니다.");
    const channelsResult: ChannelInfo[] = [];

    for (const target of CHANNELS_TO_FETCH) {
      // 1. 핸들로 채널 ID 및 정보 조회 (실시간 no-store fetch 적용)
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(target.handle)}&key=${activeKey}`;
      const channelRes = await fetch(channelUrl, { cache: 'no-store' });
      
      if (!channelRes.ok) {
        throw new Error(`채널 ${target.handle} 조회 실패 (status: ${channelRes.status})`);
      }
      
      const channelData = await channelRes.json();
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error(`핸들 ${target.handle}에 매칭되는 채널을 찾을 수 없습니다.`);
      }

      const item = channelData.items[0];
      const channelId = item.id;
      const channelName = item.snippet.title;
      const channelLogo = item.snippet.thumbnails?.default?.url || "";
      const subscriberCount = parseInt(item.statistics.subscriberCount || '0', 10);
      const uploadsPlaylistId = item.contentDetails.relatedPlaylists.uploads;

      // 구독자 수 보기 좋게 변환
      let subscribersText = `${(subscriberCount / 10000).toFixed(1)}만명`;
      if (subscriberCount >= 100000) {
        subscribersText = `${(subscriberCount / 10000).toFixed(1)}만명`;
      } else {
        subscribersText = `${subscriberCount.toLocaleString()}명`;
      }

      // 2. 업로드 재생목록에서 최근 동영상 조회 (maxResults=50 으로 대폭 상향 및 실시간 no-store fetch 적용)
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${activeKey}`;
      const playlistRes = await fetch(playlistUrl, { cache: 'no-store' });
      
      if (!playlistRes.ok) {
        throw new Error(`채널 ${channelName}의 업로드 재생목록 조회 실패`);
      }

      const playlistData = await playlistRes.json();
      const rawItems = playlistData.items || [];
      const videoIds: string[] = [];
      const tempVideos: any[] = [];

      for (const rawItem of rawItems) {
        const videoId = rawItem.contentDetails.videoId;
        const publishedAtStr = rawItem.snippet.publishedAt;
        const publishedDate = new Date(publishedAtStr);

        // 최근 35일(5주) 이내에 업로드된 모든 비디오 수집
        if (publishedDate >= collectStartDate) {
          videoIds.push(videoId);
          tempVideos.push({
            id: videoId,
            publishedAt: publishedAtStr,
            title: rawItem.snippet.title,
            description: rawItem.snippet.description || "",
            thumbnail: rawItem.snippet.thumbnails?.maxres?.url || 
                       rawItem.snippet.thumbnails?.standard?.url || 
                       rawItem.snippet.thumbnails?.high?.url || 
                       rawItem.snippet.thumbnails?.medium?.url || 
                       "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=640&q=80"
          });
        }
      }

// 유튜브 쇼츠 여부를 HTTP HEAD 요청의 리다이렉트 여부로 판별하는 헬퍼 함수
async function checkIfShorts(videoId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual',
      cache: 'no-store'
    });
    const isShort = res.status === 200;
    console.log(`[YouTube API] VideoId ${videoId} HEAD status: ${res.status} -> ${isShort ? 'SHORTS' : 'VIDEO'}`);
    return isShort;
  } catch (e) {
    console.error(`[YouTube API] Video ID ${videoId} 쇼츠 여부 확인 HEAD 요청 중 에러:`, e);
    return null;
  }
}

      const finalVideos: VideoItem[] = [];

      // 3. 필터링된 영상이 있으면 상세 정보(러닝타임 등) 일괄 조회
      if (videoIds.length > 0) {
        // videos.list API는 쉼표로 다수 ID 조회 가능 (실시간 no-store fetch 적용)
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${activeKey}`;
        const detailsRes = await fetch(detailsUrl, { cache: 'no-store' });
        
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          const detailItems = detailsData.items || [];

          // 모든 비디오의 쇼츠 여부를 HEAD 요청으로 실시간 검증 (병렬 처리)
          const shortsChecks = await Promise.all(
            tempVideos.map(async (tempVideo) => {
              const isShort = await checkIfShorts(tempVideo.id);
              return { id: tempVideo.id, isShort };
            })
          );
          const shortsMap = new Map<string, boolean | null>(
            shortsChecks.map(c => [c.id, c.isShort])
          );

          for (const tempVideo of tempVideos) {
            const detailItem = detailItems.find((d: any) => d.id === tempVideo.id);
            let duration = "00:00";
            let durationSeconds = 0;
            let videoType: 'video' | 'shorts' = 'video';

            if (detailItem) {
              const parsedDuration = parseISODuration(detailItem.contentDetails.duration);
              duration = parsedDuration.text;
              durationSeconds = parsedDuration.seconds;
              
              // 1. HTTP HEAD 검증 결과 사용
              const headCheck = shortsMap.get(tempVideo.id);
              if (headCheck !== undefined && headCheck !== null) {
                videoType = headCheck ? 'shorts' : 'video';
              } else {
                // 2. HTTP 검증 실패 시 기존 duration 기반으로 폴백
                videoType = durationSeconds <= 60 ? 'shorts' : 'video';
              }
              
              // 상세 정보의 maxres 썸네일이 있을 시 업데이트
              if (detailItem.snippet.thumbnails?.maxres?.url) {
                tempVideo.thumbnail = detailItem.snippet.thumbnails.maxres.url;
              }
            }

            finalVideos.push({
              id: tempVideo.id,
              title: tempVideo.title,
              thumbnail: tempVideo.thumbnail,
              duration,
              durationSeconds,
              publishedAt: tempVideo.publishedAt,
              description: tempVideo.description,
              type: videoType,
              videoUrl: `https://www.youtube.com/watch?v=${tempVideo.id}`
            });
          }
        }
      }

      channelsResult.push({
        id: channelId,
        name: channelName,
        handle: target.handle,
        logo: channelLogo,
        subscribers: subscriberCount,
        subscribersText,
        isCompany: target.isCompany,
        videos: finalVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      });
    }

    return {
      channels: channelsResult,
      reportingRange: rangeText,
      isMock: false
    };

  } catch (error) {
    console.error("[YouTube API] 실시간 데이터 로드 중 에러 발생, 가데이터로 전환합니다:", error);
    return {
      channels: MOCK_CHANNELS,
      reportingRange: rangeText,
      isMock: true
    };
  }
}
