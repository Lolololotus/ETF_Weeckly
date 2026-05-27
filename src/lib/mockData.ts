export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string; // "MM:SS" or "HH:MM:SS" format
  durationSeconds: number;
  publishedAt: string; // ISO String
  description: string;
  type: 'video' | 'shorts';
  videoUrl: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
  handle: string;
  logo: string;
  subscribers: number;
  subscribersText: string;
  isCompany: boolean; // KODEX: true, others: false
  videos: VideoItem[];
}

// 오늘 기준 상대 날짜(Days ago) 계산용 헬퍼 함수
// 이를 통해 대시보드를 로드할 때마다 가데이터의 날짜가 항상 "이번 주"와 "지난주" 범위 안에 최신화되어 안착합니다.
export function getPastDateString(daysAgo: number, timeStr: string = "10:00:00Z"): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const datePart = d.toISOString().split('T')[0];
  return `${datePart}T${timeStr}`;
}

export const MOCK_CHANNELS: ChannelInfo[] = [
  {
    id: "UCKODEXETF", 
    name: "삼성자산운용 KODEX ETF",
    handle: "@KODEXETF",
    logo: "https://yt3.ggpht.com/ytc/AIdro5kZl0V9nQy_2lYnUq8pZ6kF_jV-m9eB_Zg9oQ=s176-c-k-c0x00ffffff-no-rj",
    subscribers: 534000,
    subscribersText: "53.4만명",
    isCompany: true,
    videos: [
      {
        id: "kodex-v1",
        title: "[KODEX 주간 ETF 세미나] 금리 인하 수혜, 어떤 ETF가 가장 유리할까? 실전 포트폴리오 대공개",
        thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=640&q=80",
        duration: "14:25",
        durationSeconds: 865,
        publishedAt: getPastDateString(2, "10:00:00Z"), // 오늘 기준 2일 전 (이번 주)
        description: "금리 인하 기조 속에서 가장 주목해야 할 KODEX ETF 3종을 심층 분석합니다. 채권형 ETF부터 배당 성장형 ETF까지 마케팅 담당자가 직접 알려드리는 고품격 재테크 가이드! 지금 바로 시청하시고 스마트한 자산 관리를 시작해보세요. 구독과 좋아요는 다음 주간 분석에도 큰 힘이 됩니다!",
        type: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "kodex-v2",
        title: "KODEX 미국 AI 테마 ETF 출시 기념! 왜 빅테크 기업에 집중해야 하는가?",
        thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=640&q=80",
        duration: "10:15",
        durationSeconds: 615,
        publishedAt: getPastDateString(7, "09:30:00Z"), // 오늘 기준 7일 전 (지난주 수요일 경계면 또는 지난주)
        description: "인공지능 혁명의 핵심 인프라인 빅테크 기업들에 압축 투자할 수 있는 KODEX의 신규 ETF 라인업을 소개합니다. AI 반도체 밸류체인부터 거대 언어 모델(LLM) 소프트웨어 리더들까지 한눈에 파악하세요! 상세한 투자 설명은 본 영상과 투자설명서를 확인해 주시기 바랍니다.",
        type: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "kodex-s1",
        title: "[Shorts] 단 60초 만에 끝내는 미국 반도체 ETF 투자 전략 💡",
        thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=640&q=80",
        duration: "00:58",
        durationSeconds: 58,
        publishedAt: getPastDateString(3, "15:30:00Z"), // 오늘 기준 3일 전 (이번 주)
        description: "미국 반도체 시장을 가장 완벽하게 담아내는 KODEX 미국반도체MV ETF! 60초 만에 이 ETF의 매력 포인트를 빠르게 정리해 드립니다. 바쁜 현대인을 위한 초압축 반도체 투자 인사이트! #shorts #semiconductor #KODEX #ETF투자",
        type: "shorts",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "kodex-s2",
        title: "[Shorts] 연금 계좌에서 10년 묻어둘 최고의 ETF는? 딱 정해드립니다!",
        thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=640&q=80",
        duration: "00:45",
        durationSeconds: 45,
        publishedAt: getPastDateString(6, "09:00:00Z"), // 오늘 기준 6일 전 (이번 주)
        description: "연금저축 및 퇴직연금(IRP) 계좌에서 장기 투자할 때 절세 혜택과 배당 성장을 동시에 잡을 수 있는 KODEX만의 전략형 ETF를 강력 추천합니다. 편안하고 든든한 노후 준비를 위한 정답, 영상으로 직접 확인하세요! #shorts #연금저축 #IRP #배당성장",
        type: "shorts",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "kodex-s3",
        title: "[Shorts] ISA 계좌 필수 꿀팁! 절세 혜택 200% 활용하는 법 💰",
        thumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=640&q=80",
        duration: "00:52",
        durationSeconds: 52,
        publishedAt: getPastDateString(1, "11:00:00Z"), // 오늘 기준 1일 전 (이번 주)
        description: "절세 만능 통장이라 불리는 ISA 계좌! 하지만 국내 상장 해외 ETF를 담을 때 그 진가가 나타납니다. 비과세 혜택 한도를 꽉 채울 KODEX ETF 팁을 단 50초 안에 확인해 보세요! #shorts #ISA #절세 #재테크",
        type: "shorts",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      }
    ]
  },
  {
    id: "UCtiger_etf",
    name: "스마트 타이거 – TIGER ETF",
    handle: "@tiger_etf",
    logo: "https://yt3.ggpht.com/ytc/AIdro5kl2-9jOpxe0gW1V_X7R8G8Z-lV_y4T9A=s176-c-k-c0x00ffffff-no-rj",
    subscribers: 502000,
    subscribersText: "50.2만명",
    isCompany: false,
    videos: [
      {
        id: "tiger-v1",
        title: "[TIGER 투자 가이드] 2026년 2분기 글로벌 테마 ETF 트렌드 완벽 브리핑",
        thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=640&q=80",
        duration: "08:12",
        durationSeconds: 492,
        publishedAt: getPastDateString(2, "14:00:00Z"), // 오늘 기준 2일 전 (이번 주)
        description: "글로벌 시장의 최신 거시경제 트렌드를 파악하고 포트폴리오를 다변화할 수 있는 TIGER 글로벌 ETF의 운용 가이드를 전달합니다. 최신 AI 반도체 밸류체인 및 친환경 에너지, 2차전지 시장 트렌드를 빠르게 확인하세요. 변화하는 연준의 금리 스탠스에 대응하는 실용적인 팁도 제공됩니다.",
        type: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "tiger-s1",
        title: "[Shorts] TIGER 미국배당다우존스, 왜 지금 포트폴리오에 담아야 할까?",
        thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=640&q=80",
        duration: "00:50",
        durationSeconds: 50,
        publishedAt: getPastDateString(5, "11:00:00Z"), // 오늘 기준 5일 전 (이번 주)
        description: "매월 안정적이고 성장하는 분배금(배당)을 제공하는 TIGER 미국배당다우존스 ETF! 하락장에서도 든든하게 버텨줄 배당 버퍼와 강력한 복리 효과를 쉽고 빠르게 설명해 드립니다! #shorts #tigeretf #미국배당다우존스",
        type: "shorts",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      }
    ]
  },
  {
    id: "UCSOL_ETF",
    name: "신한 SOL ETF",
    handle: "@SOL_ETF",
    logo: "https://yt3.ggpht.com/ytc/AIdro5nS5Xn-9p8aY-V8B_bU8Z5n-Y=s176-c-k-c0x00ffffff-no-rj",
    subscribers: 190000,
    subscribersText: "19만명",
    isCompany: false,
    videos: [
      {
        id: "sol-v1",
        title: "[SOL 월간 세미나] 엔화 노출형 ETF로 엔저 시대에 현명하게 대처하고 수익 극대화하는 법",
        thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=640&q=80",
        duration: "12:40",
        durationSeconds: 760,
        publishedAt: getPastDateString(1, "08:00:00Z"), // 오늘 기준 1일 전 (이번 주)
        description: "역대급 엔저 현상 속에서 향후 환율 반등 및 엔화 표시 자산 투자 혜택을 극대화할 수 있는 신한자산운용 SOL 일본엔화 노출형 ETF 집중 분석입니다. 전문가들이 전망하는 환율의 저점 포착 시기와 환헤지/환노출 포트폴리오의 장단점을 명확하게 짚어 드립니다.",
        type: "video",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "sol-s1",
        title: "[Shorts] 연 12% 수준의 고배당 커버드콜, 실체 대공개! 진실은 무엇인가?",
        thumbnail: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=640&q=80",
        duration: "00:59",
        durationSeconds: 59,
        publishedAt: getPastDateString(4, "09:00:00Z"), // 오늘 기준 4일 전 (이번 주)
        description: "최근 투자자들 사이에서 가장 뜨거운 관심을 받는 고배당 커버드콜 ETF! 매월 높은 분배금을 주지만, 원금 갉아먹기라는 소문도 있습니다. 이 커버드콜의 실제 분배금 재원과 장단점을 단 60초 만에 팩트로만 정확하게 짚어드립니다. #shorts #soletf #고배당 #커버드콜",
        type: "shorts",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      {
        id: "sol-s2",
        title: "[Shorts] SOL 미국30년국채 커버드콜 ETF, 핵심만 30초 요약정리!",
        thumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=640&q=80",
        duration: "00:40",
        durationSeconds: 40,
        publishedAt: getPastDateString(7, "17:00:00Z"), // 오늘 기준 7일 전 (지난주)
        description: "미국 장기 국채 이자 수익과 콜옵션 매도 프리미엄을 동시에 수취하는 월배당 효자 ETF! SOL의 대표 스테디셀러 상품에 대해 30초 만에 쉽게 알아봅시다. #shorts #미국채30년 #월배당 #채권투자",
        type: "shorts",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      }
    ]
  }
];
