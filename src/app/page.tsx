"use client";

import React, { useState, useEffect } from 'react';
import { ChannelInfo, VideoItem } from '@/lib/mockData';
import { getDashboardData } from '@/lib/youtube';

// 최근 N주간의 목~수 리포팅 주간 목록을 계산하는 헬퍼 함수
interface ReportingWeek {
  id: string;
  label: string;
  start: Date;
  end: Date;
}

function generateReportingWeeks(count: number = 4): ReportingWeek[] {
  const weeks: ReportingWeek[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const target = new Date(today);
    // i주 전 날짜로 조정
    target.setDate(today.getDate() - (i * 7));
    
    const currentDay = target.getDay(); // 0: 일, 1: 월, ..., 3: 수
    const latestWednesday = new Date(target);
    latestWednesday.setHours(0, 0, 0, 0);
    
    let diffToWed = 3 - currentDay;
    if (diffToWed < 0) {
      diffToWed += 7;
    }
    latestWednesday.setDate(target.getDate() + diffToWed);
    
    // 수요일 기준 전주 목요일 (6일 전)
    const prevThursday = new Date(latestWednesday);
    prevThursday.setDate(latestWednesday.getDate() - 6);
    prevThursday.setHours(0, 0, 0, 0);
    
    // 이번 주 수요일 23:59:59
    const wednesdayEnd = new Date(latestWednesday);
    wednesdayEnd.setHours(23, 59, 59, 999);
    
    const formattedStart = `${prevThursday.getMonth() + 1}월 ${prevThursday.getDate()}일`;
    const formattedEnd = `${wednesdayEnd.getMonth() + 1}월 ${wednesdayEnd.getDate()}일`;
    
    const label = `${prevThursday.getFullYear()}년 ${formattedStart} ~ ${formattedEnd}` + (i === 0 ? ' (이번 주)' : i === 1 ? ' (지난주)' : ` (${i}주 전)`);
    
    weeks.push({
      id: `${prevThursday.getTime()}-${wednesdayEnd.getTime()}`,
      label,
      start: prevThursday,
      end: wednesdayEnd
    });
  }
  
  return weeks;
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // 필터 1: 비디오 형식 필터 (전체/동영상/Shorts)
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'shorts'>('all');
  
  // 필터 2: 채널별 필터 (전체/KODEX/TIGER/SOL/RISE/ACE)
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'kodex' | 'tiger' | 'sol' | 'rise' | 'ace'>('all');
  
  // 동적 리포팅 주간 옵션 목록 (최근 4주)
  const [reportingWeeks, setReportingWeeks] = useState<ReportingWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');

  const loadData = async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // 서버 API Route를 호출하여 API 키 노출 없이 실시간 데이터를 안전하게 조회 (타임스탬프로 캐시 무력화)
      const res = await fetch(`/api/dashboard?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`API 응답 실패: ${res.status}`);
      }
      const data = await res.json();
      setChannels(data.channels);
    } catch (error) {
      console.error("데이터 로드 실패 (실시간 연동 실패), 가데이터로 폴백합니다:", error);
      try {
        // API 호출 에러 시 클라이언트 측에서 직접 getDashboardData를 호출하여 가데이터 폴백 수행
        const fallbackData = await getDashboardData();
        setChannels(fallbackData.channels);
      } catch (fbError) {
        console.error("가데이터 폴백 에러:", fbError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 이번 주와 지난주의 업로드 통계를 상시 비교 분석하는 헬퍼 함수
  const getComparisonStats = (channel: ChannelInfo) => {
    const weeks = generateReportingWeeks(2); // [이번주, 지난주]
    if (weeks.length < 2) return { thisWeek: 0, lastWeek: 0, diff: 0 };
    
    const thisWeekVideos = getFilteredVideosForSelectedWeek(channel.videos, weeks[0]);
    const lastWeekVideos = getFilteredVideosForSelectedWeek(channel.videos, weeks[1]);
    
    const thisWeek = thisWeekVideos.length;
    const lastWeek = lastWeekVideos.length;
    const diff = thisWeek - lastWeek;
    
    return { thisWeek, lastWeek, diff };
  };

  useEffect(() => {
    // 캘린더 주간 옵션 세팅 (최근 4주)
    const weeks = generateReportingWeeks(4);
    setReportingWeeks(weeks);
    if (weeks.length > 0) {
      setSelectedWeekId(weeks[0].id); // 최초 진입 시 '이번 주'가 기본 선택되도록 설정
    }
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  // 선택된 주간 객체 반환
  const getSelectedWeek = (): ReportingWeek | undefined => {
    return reportingWeeks.find(w => w.id === selectedWeekId);
  };

  // 선택된 주간의 날짜 범위 필터에 맞는 비디오만 추출하는 함수
  const getFilteredVideosForSelectedWeek = (videos: VideoItem[], week: ReportingWeek | undefined): VideoItem[] => {
    if (!week) return videos;
    return videos.filter(v => {
      const pubDate = new Date(v.publishedAt);
      return pubDate >= week.start && pubDate <= week.end;
    });
  };

  // 모든 채널의 비디오를 하나의 목록으로 통합 후 selectedWeek 기준 필터링 및 정렬
  const getAllVideos = (): (VideoItem & { channelName: string; channelLogo: string; isCompany: boolean; handle: string })[] => {
    const all: any[] = [];
    const selectedWeek = getSelectedWeek();

    channels.forEach(ch => {
      // 각 채널 비디오 중 selectedWeek 기간 내 영상만 1차 필터링
      const weekFiltered = getFilteredVideosForSelectedWeek(ch.videos, selectedWeek);
      
      weekFiltered.forEach(v => {
        all.push({
          ...v,
          channelName: ch.name,
          channelLogo: ch.logo,
          isCompany: ch.isCompany,
          handle: ch.handle
        });
      });
    });
    return all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  };

  // 1차 주간 필터링된 비디오 목록에 대하여 채널 필터 및 비디오 형식 필터 결합 적용
  const filteredVideos = getAllVideos().filter(v => {
    // 1. 비디오 형식 필터 적용
    const formatMatch = activeTab === 'all' || v.type === activeTab;
    
    // 2. 채널별 필터 적용
    let channelMatch = true;
    if (selectedChannel === 'kodex') {
      channelMatch = v.isCompany; // 자사 KODEX 여부
    } else if (selectedChannel === 'tiger') {
      channelMatch = v.channelName.toLowerCase().includes('tiger');
    } else if (selectedChannel === 'sol') {
      channelMatch = v.channelName.toLowerCase().includes('sol');
    } else if (selectedChannel === 'rise') {
      channelMatch = v.channelName.toLowerCase().includes('rise') || v.handle.toLowerCase().includes('rise');
    } else if (selectedChannel === 'ace') {
      channelMatch = v.channelName.toLowerCase().includes('ace') || v.handle.toLowerCase().includes('ace');
    }
    
    return formatMatch && channelMatch;
  });

  // 선택된 주간에 따른 채널별 업로드 통계(Video/Shorts 분리) 계산
  const getUploadStatsForWeek = (channel: ChannelInfo) => {
    const selectedWeek = getSelectedWeek();
    const weekVideos = getFilteredVideosForSelectedWeek(channel.videos, selectedWeek);
    
    const videos = weekVideos.filter(v => v.type === 'video').length;
    const shorts = weekVideos.filter(v => v.type === 'shorts').length;
    return { videos, shorts, total: videos + shorts };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 헤더 영역 - 깔끔하고 직관적인 프로덕션 모드 */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* KODEX 상징 네이비 로고 블록 */}
            <div className="bg-kodex-navy text-white px-3 py-1.5 rounded font-black tracking-widest text-lg">
              KODEX
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">유튜브 경쟁사 모니터링 대시보드</h1>
              <p className="text-xs text-slate-500 mt-0.5">삼성자산운용 KODEX 마케팅 의사결정 지원 플랫폼</p>
            </div>
          </div>

          {/* 컨트롤 영역: 주간 캘린더 드롭박스 & 새로고침 */}
          <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
            {/* 리포팅 주간 선택 드롭박스 */}
            <div className="relative flex-1 md:flex-none">
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="w-full md:w-[320px] bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200/40 focus:outline-none focus:ring-2 focus:ring-kodex-navy transition-all appearance-none cursor-pointer pr-10 shadow-sm"
              >
                {reportingWeeks.map(week => (
                  <option key={week.id} value={week.id}>
                    {week.label}
                  </option>
                ))}
              </select>
              {/* 드롭박스 아이콘 화살표 */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm text-slate-700 p-2.5 rounded-xl flex items-center justify-center transition-colors disabled:opacity-60 cursor-pointer text-xs font-bold gap-1.5"
              title="데이터 실시간 동기화"
            >
              <svg 
                className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin text-kodex-blue' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
              </svg>
              <span>새로고침</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {loading ? (
          /* 로딩 스켈레톤 UI */
          <div className="space-y-10 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white h-48 rounded-2xl border border-slate-100"></div>
              ))}
            </div>
            <div className="bg-white h-96 rounded-2xl border border-slate-100"></div>
          </div>
        ) : (
          <>
            {/* [섹션 1] 종합 스코어보드 */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-1 h-4 bg-kodex-navy rounded-full"></span>
                주간 유튜브 스코어보드
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {channels.map(channel => {
                  const stats = getUploadStatsForWeek(channel);
                  const compStats = getComparisonStats(channel);
                  
                  return channel.isCompany ? (
                    /* KODEX 자사 카드 - 압도적인 시각화 */
                    <div 
                      key={channel.id} 
                      className="bg-white border-2 border-kodex-navy rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-52 transition-all duration-300 hover:shadow-lg cursor-pointer"
                      onClick={() => setSelectedChannel('kodex')}
                      title="클릭 시 하단 테이블을 KODEX 콘텐츠로 필터링합니다"
                    >
                      {/* 로고 및 채널명 */}
                      <div className="flex items-center gap-3">
                        <img 
                          src={channel.logo} 
                          alt={channel.name} 
                          className="w-10 h-10 rounded-full border border-kodex-navy/20 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=80&q=80"
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-sm leading-none">{channel.name}</h3>
                            <span className="bg-kodex-navy text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide shrink-0">
                              KODEX 자사
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{channel.handle}</span>
                        </div>
                      </div>

                      {/* 주요 성과 수치 */}
                      <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium leading-none">총 구독자 수</p>
                          <p className="text-2xl font-black text-kodex-navy mt-1 tracking-tight">
                            {channel.subscribersText}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium leading-none">선택 주간 업로드</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-2xl font-black text-kodex-navy tracking-tight">{stats.total}건</p>
                            <span className="text-[10px] text-slate-500 font-medium shrink-0">
                              (동영 {stats.videos} / 쇼츠 {stats.shorts})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* [신규 고도화] 이번 주 vs 지난 주 비교 지표 상시 출력 */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-50/60 font-semibold">
                        <div className="flex gap-2">
                          <span>이번주: <strong className="text-kodex-navy">{compStats.thisWeek}건</strong></span>
                          <span className="text-slate-200">|</span>
                          <span>지난주: <strong className="text-slate-600">{compStats.lastWeek}건</strong></span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter ${
                          compStats.diff > 0 
                            ? 'bg-red-50 text-red-600 border border-red-100/50' 
                            : compStats.diff < 0 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                              : 'bg-slate-50 text-slate-500 border border-slate-200/50'
                        }`}>
                          {compStats.diff > 0 ? `▲ 이번주 +${compStats.diff}건 증가` : compStats.diff < 0 ? `▼ 이번주 -${Math.abs(compStats.diff)}건 감소` : '지난주와 동일'}
                        </span>
                      </div>
                      
                      {/* 백그라운드 KODEX 네이비 포인트 */}
                      <div className="absolute right-0 top-0 h-full w-1.5 bg-kodex-navy"></div>
                    </div>
                  ) : (
                    /* 경쟁사 카드 - 차분하게 톤다운 처리 */
                    <div 
                      key={channel.id} 
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-52 transition-all duration-300 hover:shadow-md cursor-pointer relative"
                      onClick={() => {
                        const nameLower = channel.name.toLowerCase();
                        if (nameLower.includes('tiger')) setSelectedChannel('tiger');
                        else if (nameLower.includes('sol')) setSelectedChannel('sol');
                        else if (nameLower.includes('rise')) setSelectedChannel('rise');
                        else if (nameLower.includes('ace')) setSelectedChannel('ace');
                      }}
                      title={`클릭 시 하단 테이블을 ${
                        channel.name.toUpperCase().includes('TIGER') ? 'TIGER' :
                        channel.name.toUpperCase().includes('SOL') ? 'SOL' :
                        channel.name.toUpperCase().includes('RISE') ? 'RISE' : 'ACE'
                      } 콘텐츠로 필터링합니다`}
                    >
                      {/* 로고 및 채널명 */}
                      <div className="flex items-center gap-3">
                        <img 
                          src={channel.logo} 
                          alt={channel.name} 
                          className="w-10 h-10 rounded-full border border-slate-100 object-cover grayscale opacity-85"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=80&q=80"
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-700 text-sm leading-none">{channel.name}</h3>
                          </div>
                          <span className="text-xs text-slate-400">{channel.handle}</span>
                        </div>
                      </div>

                      {/* 주요 성과 수치 */}
                      <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium leading-none">총 구독자 수</p>
                          <p className="text-xl font-bold text-slate-600 mt-1 tracking-tight">
                            {channel.subscribersText}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium leading-none">선택 주간 업로드</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-xl font-bold text-slate-600 tracking-tight">{stats.total}건</p>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              (동영 {stats.videos} / 쇼츠 {stats.shorts})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* [신규 고도화] 이번 주 vs 지난 주 비교 지표 상시 출력 */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 font-semibold">
                        <div className="flex gap-2">
                          <span>이번주: <strong className="text-slate-600">{compStats.thisWeek}건</strong></span>
                          <span className="text-slate-200">|</span>
                          <span>지난주: <strong className="text-slate-500">{compStats.lastWeek}건</strong></span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter ${
                          compStats.diff > 0 
                            ? 'bg-red-50/70 text-red-600 border border-red-100/30' 
                            : compStats.diff < 0 
                              ? 'bg-blue-50/70 text-blue-600 border border-blue-100/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-200/30'
                        }`}>
                          {compStats.diff > 0 ? `▲ 이번주 +${compStats.diff}건` : compStats.diff < 0 ? `▼ 이번주 -${Math.abs(compStats.diff)}건` : '동일'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* [섹션 2] 상세 분석 테이블 */}
            <section className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/60 pb-3">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1 h-4 bg-kodex-navy rounded-full"></span>
                  콘텐츠 업로드 상세 현황
                </h2>

                {/* 이중 필터 영역 (채널 필터 + 비디오 포맷 필터) */}
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* [고도화] 채널별 선택 필터 (Chips 형태) */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                    <button
                      onClick={() => setSelectedChannel('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedChannel === 'all'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      전체 채널
                    </button>
                    <button
                      onClick={() => setSelectedChannel('kodex')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedChannel === 'kodex'
                          ? 'bg-kodex-navy text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      KODEX (자사)
                    </button>
                    <button
                      onClick={() => setSelectedChannel('tiger')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedChannel === 'tiger'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      TIGER
                    </button>
                    <button
                      onClick={() => setSelectedChannel('sol')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedChannel === 'sol'
                          ? 'bg-slate-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      SOL
                    </button>
                    <button
                      onClick={() => setSelectedChannel('rise')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedChannel === 'rise'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      RISE
                    </button>
                    <button
                      onClick={() => setSelectedChannel('ace')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedChannel === 'ace'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      ACE
                    </button>
                  </div>

                  <span className="text-slate-300 hidden lg:inline">|</span>

                  {/* 비디오 포맷 필터 탭 */}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'all'
                          ? 'bg-white text-kodex-navy shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      전체 형식
                    </button>
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'video'
                          ? 'bg-white text-kodex-navy shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      동영상만
                    </button>
                    <button
                      onClick={() => setActiveTab('shorts')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'shorts'
                          ? 'bg-white text-kodex-navy shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Shorts만
                    </button>
                  </div>
                  
                </div>
              </div>

              {/* 상세 분석 테이블 리스트 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold tracking-tight">
                        <th className="py-4 px-6 w-52">채널</th>
                        <th className="py-4 px-4 w-24 text-center">구분</th>
                        <th className="py-4 px-4 w-40">썸네일 (클릭 시 재생)</th>
                        <th className="py-4 px-6">영상 제목</th>
                        <th className="py-4 px-4 w-28 text-center">러닝타임</th>
                        <th className="py-4 px-4 w-32 text-center">업로드 일시</th>
                        <th className="py-4 px-6 w-80">영상 설명 요약 (설명란)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredVideos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-16 text-slate-400 font-medium">
                            {selectedChannel !== 'all' || activeTab !== 'all' ? (
                              <div className="space-y-1">
                                <p>선택하신 조건에 부합하는 영상이 없습니다.</p>
                                <button 
                                  onClick={() => { setSelectedChannel('all'); setActiveTab('all'); }} 
                                  className="text-xs text-kodex-blue font-bold underline hover:text-kodex-navy cursor-pointer mt-1"
                                >
                                  필터 초기화하기
                                </button>
                              </div>
                            ) : (
                              "선택하신 리포팅 주간 내에 등록된 영상 내역이 존재하지 않습니다."
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredVideos.map((video) => (
                          <tr 
                            key={video.id} 
                            className={`group hover:bg-slate-50/40 transition-colors ${
                              video.isCompany ? 'bg-kodex-light-bg/10' : ''
                            }`}
                          >
                            {/* 채널 정보 */}
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-2.5">
                                <img 
                                  src={video.channelLogo} 
                                  alt={video.channelName} 
                                  className={`w-7 h-7 rounded-full object-cover ${!video.isCompany && 'grayscale'}`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=80&q=80"
                                  }}
                                />
                                <div>
                                  <div className="font-semibold text-slate-800 leading-snug flex items-center gap-1">
                                    <span className={video.isCompany ? 'text-kodex-navy font-bold' : 'text-slate-600 font-medium'}>
                                      {video.channelName.replace("삼성자산운용 ", "").replace("스마트 타이거 – ", "")}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{video.handle}</span>
                                </div>
                              </div>
                            </td>

                            {/* 영상 구분 배지 */}
                            <td className="py-5 px-4 text-center">
                              {video.type === 'shorts' ? (
                                <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Shorts
                                </span>
                              ) : (
                                <span className="bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Video
                                </span>
                              )}
                            </td>

                            {/* 썸네일 (클릭 시 새창 이동) */}
                            <td className="py-5 px-4">
                              <a 
                                href={video.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block aspect-video w-32 rounded-lg object-cover overflow-hidden bg-slate-100 border border-slate-200/50 shadow-sm relative group"
                              >
                                <img 
                                  src={video.thumbnail} 
                                  alt={video.title} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=160&q=80"
                                  }}
                                />
                                {/* 재생 마스크 호버 레이어 */}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </a>
                            </td>

                            {/* 영상 제목 */}
                            <td className="py-5 px-6">
                              <a 
                                href={video.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`font-semibold hover:underline block leading-snug line-clamp-2 ${
                                  video.isCompany ? 'text-slate-900 group-hover:text-kodex-blue' : 'text-slate-700 hover:text-slate-900'
                                }`}
                              >
                                {video.title}
                              </a>
                            </td>

                            {/* 러닝타임 */}
                            <td className="py-5 px-4 text-center font-mono text-xs text-slate-500">
                              {video.duration}
                            </td>

                            {/* 업로드 일시 */}
                            <td className="py-5 px-4 text-center text-xs text-slate-500 leading-tight">
                              {new Date(video.publishedAt).toLocaleDateString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit'
                              })}
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(video.publishedAt).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </div>
                            </td>

                            {/* 설명란 및 툴팁 팝업 */}
                            <td className="py-5 px-6 relative tooltip-trigger">
                              <div className="text-xs text-slate-500 leading-relaxed line-clamp-3 select-none">
                                {video.description || <span className="text-slate-300 italic">설명이 없는 동영상입니다.</span>}
                              </div>
                              
                              {/* 설명란 마우스 오버 툴팁 */}
                              {video.description && (
                                <div className="tooltip-content absolute z-50 right-6 bottom-full mb-2 w-80 bg-slate-900/95 border border-slate-700/60 rounded-xl p-4 shadow-2xl opacity-0 visibility-hidden transition-all duration-200 pointer-events-none backdrop-blur-md">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-kodex-blue">
                                      영상 설명란 전문
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      Length: {video.description.length}자
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 font-medium leading-relaxed max-h-48 overflow-y-auto pr-1 whitespace-pre-wrap select-text">
                                    {video.description}
                                  </p>
                                  <div className="absolute right-6 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95"></div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-slate-100 py-8 mt-16 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-6 space-y-2">
          <p>© 2026 KODEX YouTube Competitor Dashboard. All rights reserved.</p>
          <p>이 대시보드는 모니터링 편의 목적으로 YouTube Data API v3를 활용하여 제작되었습니다.</p>
        </div>
      </footer>
    </div>
  );
}
