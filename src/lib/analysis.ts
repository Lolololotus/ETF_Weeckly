import { VideoItem } from './mockData';

export interface VideoAnalysisResult {
  publishedAtKst: string;
  contentType: '동영상(롱폼)' | 'Shorts(숏폼)' | '라이브';
  durationCategory: string;
  durationDetail: string;
  hookMessage: string;
  ctaMessage: string;
  thumbnailUrl: string;
  thumbnailCopy: string;
  thumbnailVisual: string;
  thumbnailStyle: '정보 요약형' | '자극적 호기심 유발형' | '브랜드 로고 강조형' | '기타 전략형';
  matchedProduct: string;
  matchedUSP: string;
  productionType: '브이로그(Vlog)형' | '스튜디오 토크쇼/인터뷰형' | '정보 전달/모션그래픽형' | '스케치 코미디/웹예능형' | 'AI 제작형';
  productionDetail: string;
}

// ISO Date를 한국 표준시(KST) 문자열로 포맷팅하는 헬퍼 함수
export function formatToKst(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    // KST는 UTC+9
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    
    // KST 보정 시간 적용
    const kstHours = (hours + 9) % 24;
    const ampm = kstHours >= 12 ? '오후' : '오전';
    const displayHours = kstHours % 12 === 0 ? 12 : kstHours % 12;
    
    return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHours}시 ${minutes}분`;
  } catch (e) {
    return dateStr;
  }
}

export function analyzeVideo(video: VideoItem, channelName: string, handle: string): VideoAnalysisResult {
  const title = video.title || '';
  const desc = video.description || '';
  const seconds = video.durationSeconds || 0;
  
  // 1. 기본 메타데이터 분석
  // 발행 일시 (KST)
  const publishedAtKst = formatToKst(video.publishedAt);
  
  // 콘텐츠 유형 분류
  let contentType: '동영상(롱폼)' | 'Shorts(숏폼)' | '라이브' = '동영상(롱폼)';
  if (video.type === 'shorts' || seconds <= 60) {
    contentType = 'Shorts(숏폼)';
  } else if (title.includes('LIVE') || title.includes('라이브') || desc.includes('LIVE') || desc.includes('라이브') || seconds === 0 || seconds > 7200) {
    contentType = '라이브';
  }
  
  // 영상 길이 분류
  let durationCategory = '';
  let durationDetail = '';
  if (contentType === 'Shorts(숏폼)') {
    durationCategory = '1분 미만 (숏폼)';
    durationDetail = '짧은 호흡의 세로형 비디오로 모바일 사용자층의 높은 유입을 겨냥합니다.';
  } else if (seconds >= 900) { // 15분 이상
    durationCategory = '15분 이상 (심층 소비)';
    durationDetail = '전문적이고 깊이 있는 재테크 정보를 전달하여 충성 고객의 지속 시청을 유도합니다.';
  } else if (seconds >= 300 && seconds <= 600) { // 5~10분
    durationCategory = '5~10분 (압축형 정보)';
    durationDetail = '바쁜 투자자들을 타깃으로 핵심 투자 포인트를 빠르게 정리하여 전달하는 구성입니다.';
  } else {
    durationCategory = '중단편 정보 소비';
    durationDetail = '기본 상품 정보 및 트렌드를 요약하여 인지도를 증대시키기 적합한 길이입니다.';
  }

  // 2. 메시지 및 시각 요소 분석
  // Hook (초반 30초) 추출 및 생성
  let hookMessage = '영상 소개 및 투자자들의 이목을 끄는 질문 형태의 오프닝 메시지입니다.';
  const sentences = desc.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length > 0) {
    // 설명글 첫 문장 활용하여 현실적인 훅 추출
    hookMessage = `"${sentences[0]}" - 시청자가 겪고 있을 자산 관리의 갈증이나 최근 시장 이슈를 오프닝에서 강하게 환기하며 시작합니다.`;
  }
  
  // Call to Action (CTA)
  let ctaMessage = '더 자세한 투자 정보와 홈페이지 이벤트 참여를 제안하며 구독과 알림 설정을 독려합니다.';
  const ctaCandidates = sentences.filter(s => s.includes('구독') || s.includes('이벤트') || s.includes('확인') || s.includes('참여') || s.includes('http'));
  if (ctaCandidates.length > 0) {
    ctaMessage = `"${ctaCandidates[0]}" - 영상 말미 및 댓글/더보기 란을 통해 공식 채널 구독 유도 및 실질적인 혜택 페이지(매수 인증, 경품 이벤트 등)로의 연결을 꾀하고 있습니다.`;
  }

  // 썸네일 분석
  let thumbnailStyle: '정보 요약형' | '자극적 호기심 유발형' | '브랜드 로고 강조형' | '기타 전략형' = '정보 요약형';
  let thumbnailCopy = '영상 제목과 매칭되는 핵심 상품 키워드 강조';
  let thumbnailVisual = '브랜드 정체성에 맞춘 높은 색상 대비 적용';

  // 채널별 썸네일 분석 룰
  const brandName = channelName.toLowerCase();
  if (brandName.includes('kodex')) {
    thumbnailStyle = '브랜드 로고 강조형';
    thumbnailCopy = title.split('|')[0]?.trim() || 'KODEX 핵심 ETF 상품 출시 안내';
    thumbnailVisual = 'KODEX 전용 네이비 및 화이트 배경 컬러 대비 사용. 깔끔하고 정돈된 타이포그래피와 공식 엠블럼 노출을 통한 높은 신뢰감 부여.';
  } else if (brandName.includes('tiger')) {
    thumbnailStyle = '정보 요약형';
    thumbnailCopy = title.split('/')[0]?.trim() || 'TIGER 월배당 및 테마 투자 핵심 브리핑';
    thumbnailVisual = '스마트 타이거의 고유 심볼 및 오렌지/다크그레이 보색 활용. 강렬한 카피 텍스트 배치를 통해 클릭률 극대화 전략 취함.';
  } else if (brandName.includes('sol')) {
    thumbnailStyle = '자극적 호기심 유발형';
    thumbnailCopy = title.replace('[Shorts]', '').trim();
    thumbnailVisual = '신한 SOL의 스카이블루/화이트 레이아웃 적용. 인물의 역동적인 표정 일러스트 혹은 실사 이미지를 결합하여 시청자의 호기심 자극.';
  } else if (brandName.includes('rise')) {
    thumbnailStyle = '정보 요약형';
    thumbnailCopy = title.replace('🏆', '').trim();
    thumbnailVisual = 'KB RISE의 시그니처 옐로우/블랙 배색 적용. 가시성 높은 볼드체 타이포그래피와 주간 순매수 랭킹 그래픽을 조합해 정보성 강조.';
  } else if (brandName.includes('ace')) {
    thumbnailStyle = '정보 요약형';
    thumbnailCopy = title.split('｜')[0]?.trim() || 'ACE 미국 및 글로벌 신규 테마 상품 소개';
    thumbnailVisual = '한국투자 ACE 고유의 퍼플/인디고 컬러 블록 사용. 우주항공/반도체 등 첨단 메가 트렌드에 적합한 메탈릭 일러스트레이션 및 미래지향적 폰트 탑재.';
  }

  // 3. 비즈니스 목적 및 연출 분석 (주요 상품 & USP 매칭)
  let matchedProduct = '종합 자산 관리 상품군';
  let matchedUSP = '합리적인 분산 투자와 우수한 장기 자산 증대 솔루션 제공';

  // 타이틀 기반 상품 매칭 고도화
  if (title.includes('로보틱스') || title.includes('로봇') || title.includes('휴머노이드')) {
    if (brandName.includes('kodex')) {
      matchedProduct = 'KODEX 현대차로보틱스밸류체인TOP3플러스 ETF';
      matchedUSP = '글로벌 로봇 톱티어 보스턴다이내믹스를 보유한 현대차그룹 핵심 3사(현대차, 기아, 현대모비스)에 75% 수준으로 집중 투자하여 로보틱스 내재화 수혜 극대화.';
    } else if (brandName.includes('tiger')) {
      matchedProduct = 'TIGER 코스닥액티브 ETF / 로봇 신사업 테마';
      matchedUSP = '성장성 높은 코스닥 핵심 기업들과 아틀라스 등 현대차 로봇 기술 밸류체인 연계 투자를 통해 고수익 추구.';
    } else if (brandName.includes('ace')) {
      matchedProduct = 'ACE K휴머노이드로봇산업TOP2+ ETF';
      matchedUSP = 'K-로봇 대장주인 현대차와 로보티즈에 각각 20%씩 총 40% 집중 투자하고 국내 주요 로봇 생태계 압축 투자.';
    }
  } else if (title.includes('우주') || title.includes('항공') || title.includes('스페이스')) {
    if (brandName.includes('kodex')) {
      matchedProduct = 'KODEX 미국우주항공 ETF';
      matchedUSP = '6월 스페이스X의 역사적인 상장 일정에 맞춰, 비상장 우주항공 대표 리더 기업의 상장 시 즉각적이고 발빠른 선제 편입 지향.';
    } else if (brandName.includes('ace')) {
      matchedProduct = 'ACE 미국우주테크액티브 ETF';
      matchedUSP = '국내에서 유일하게 스페이스X IPO(상장 전 투자)에 직접 참여하여 초기 투자 수혜를 가져갈 수 있는 혁신적인 액티브 투자 수단.';
    } else if (brandName.includes('tiger')) {
      matchedProduct = 'TIGER 미국우주테크 ETF 라인업';
      matchedUSP = '민간 우주 개발 시대 개막에 따른 뉴 스페이스 테마 대장주 포트폴리오 다각화.';
    }
  } else if (title.includes('배당') || title.includes('커버드콜') || title.includes('분배') || title.includes('월배당')) {
    if (brandName.includes('kodex')) {
      matchedProduct = 'KODEX 미국배당커버드콜 / 미국성장커버드콜 ETF';
      matchedUSP = 'S&P500 또는 나스닥100 기초 자산의 성장 혜택과 함께, 각각 월중 및 월말 분배를 추구하여 포트폴리오 현금 흐름 다변화.';
    } else if (brandName.includes('tiger')) {
      matchedProduct = 'TIGER 배당커버드콜액티브 ETF';
      matchedUSP = '매월 안정적이고 성장하는 분배금(특별분배 실시)을 제공하고, 옵션 프리미엄 획득을 통한 하락장 방어 버퍼 제공.';
    } else if (brandName.includes('sol')) {
      matchedProduct = 'SOL 미국30년국채 커버드콜 ETF';
      matchedUSP = '미국 장기 국채 이자 수익과 콜옵션 매도 프리미엄을 결합하여 월배당 안정성을 극대화한 스테디셀러.';
    } else if (brandName.includes('rise')) {
      matchedProduct = 'RISE 코리아밸류업커버드콜 ETF';
      matchedUSP = '정부의 기업 가치 제고(밸류업) 프로그램 수혜 고배당주와 커버드콜 옵션 전략의 결합을 통한 고수익 분배 솔루션.';
    }
  } else if (title.includes('반도체') || title.includes('엔비디아') || title.includes('하이닉스') || title.includes('삼성전자')) {
    if (brandName.includes('kodex')) {
      matchedProduct = 'KODEX 미국반도체MV ETF';
      matchedUSP = '글로벌 반도체 리더(엔비디아 등) 밸류체인을 완벽하게 담아내는 고성장형 반도체 포트폴리오.';
    } else if (brandName.includes('tiger')) {
      matchedProduct = 'TIGER SK하이닉스/삼성전자 단일종목레버리지 ETF';
      matchedUSP = '글로벌 AI 반도체 공급망 대장주인 SK하이닉스와 삼성전자의 일간 상승률 2배 추종을 통한 고효율 레버리지 투자.';
    } else if (brandName.includes('ace')) {
      matchedProduct = 'ACE 글로벌반도체TOP4 Plus ETF / ACE 글로벌AI맞춤형반도체 ETF';
      matchedUSP = '엔비디아, TSMC, ASML, 삼성전자 등 AI 반도체 핵심 공급망 승자독식 4대 대장주 및 맞춤형 ASIC 반도체 특화 투자.';
    } else if (brandName.includes('rise')) {
      matchedProduct = 'RISE 삼성전자/SK하이닉스 단일종목레버리지 ETF';
      matchedUSP = '핵심 빅테크 기업에 1.5~2배 효율로 간편 투자하여 초과 수익 기회 제공.';
    }
  } else if (title.includes('엔화') || title.includes('일본')) {
    matchedProduct = 'SOL 일본엔화 노출형 ETF';
    matchedUSP = '역대급 엔저 현상 하에서 엔화 가치 반등(환차익)과 일본 주식 자산의 동시 투자 매력을 극대화하는 투자.';
  } else if (title.includes('코스피200') || title.includes('채권혼합')) {
    matchedProduct = 'SOL 코스피200채권혼합50 ETF';
    matchedUSP = '코스피200 주식 자산의 성장성과 국내 우량 채권 자산의 안정성을 5:5 비율로 믹싱한 연금저축/IRP 맞춤형 자산배분 솔루션.';
  } else if (title.includes('밸류업')) {
    if (brandName.includes('rise')) {
      matchedProduct = 'RISE 코리아밸류업 ETF';
      matchedUSP = '출시 후 순자산 1조 원을 빠르게 돌파한 대표 밸류업 ETF로, 국내 대표 밸류업 주주환원 우수 기업에 투명하게 분산 투자.';
    }
  }

  // 4. 제작 방식 분류
  let productionType: '브이로그(Vlog)형' | '스튜디오 토크쇼/인터뷰형' | '정보 전달/모션그래픽형' | '스케치 코미디/웹예능형' | 'AI 제작형' = '정보 전달/모션그래픽형';
  let productionDetail = '다양한 시각 자료와 자료 화면, 음성 나레이션 자막 처리를 기반으로 투자 정보를 명료하고 깔끔하게 전달하는 방식입니다.';

  if (title.includes('LIVE') || title.includes('라이브') || title.includes('세미나') || desc.includes('세미나') || desc.includes('토론')) {
    productionType = '스튜디오 토크쇼/인터뷰형';
    productionDetail = '사내 운용역 또는 외부 금융 전문가를 초빙해 대담 방식으로 최신 거시경제 전망 및 세부 상품 구조를 논리적으로 설명하여 브랜드 신뢰도를 제고하는 연출입니다.';
  } else if (title.includes('Shorts') || title.includes('쇼츠') || seconds <= 60) {
    if (desc.includes('#shorts') && (title.includes('아틀라스') || title.includes('로봇'))) {
      productionType = '스케치 코미디/웹예능형';
      productionDetail = '최근 틱톡/릴스/쇼츠에서 화제가 되는 재미있는 로봇 움직임 클립 등을 빠른 템포의 배경음악과 캐주얼한 한 줄 자막과 편집하여 일반인들의 몰입감을 유도합니다.';
    } else {
      productionType = '정보 전달/모션그래픽형';
      productionDetail = '스마트폰 세로 화면 비율에 맞추어 핵심 자막과 아이콘 그래픽을 60초 이내로 압축해 빠르게 귀에 꽂히는 음성 성우 더빙과 배치한 숏폼 정보 카드 뉴스 형태입니다.';
    }
  } else if (desc.includes('일상') || desc.includes('Vlog') || title.includes('브이로그')) {
    productionType = '브이로그(Vlog)형';
    productionDetail = '마케터나 매니저의 일상 근무 일과를 카메라에 담으며 자연스럽게 당사 신규 상장 ETF 매칭 및 세일즈 포인트를 친근하게 어필하는 소프트 브랜디드 콘텐츠 방식입니다.';
  }

  return {
    publishedAtKst,
    contentType,
    durationCategory,
    durationDetail,
    hookMessage,
    ctaMessage,
    thumbnailUrl: video.thumbnail,
    thumbnailCopy,
    thumbnailVisual,
    thumbnailStyle,
    matchedProduct,
    matchedUSP,
    productionType,
    productionDetail
  };
}
