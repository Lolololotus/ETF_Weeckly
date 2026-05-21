"use client";

import React, { useState, useEffect } from 'react';
import { ChannelInfo, VideoItem } from '@/lib/mockData';
import { getDashboardData } from '@/lib/youtube';

export default function DashboardPage() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [reportingRange, setReportingRange] = useState<string>('');
  const [isMock, setIsMock] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'shorts'>('all');
  
  // 브라우저 자가 API 키 입력 기능 지원 (localStorage 저장)
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  const loadData = async (keyToUse?: string) => {
    setLoading(true);
    try {
      const data = await getDashboardData(keyToUse);
      setChannels(data.channels);
      setReportingRange(data.reportingRange);
      setIsMock(data.isMock);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('KODEX_DASHBOARD_API_KEY') || '';
    if (savedKey) {
      setUserApiKey(savedKey);
      loadData(savedKey);
    } else {
      loadData();
    }
  }, []);

  const handleSaveApiKey = () => {
    if (userApiKey.trim()) {
      localStorage.setItem('KODEX_DASHBOARD_API_KEY', userApiKey.trim());
      loadData(userApiKey.trim());
      setShowKeyInput(false);
    } else {
      handleClearApiKey();
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('KODEX_DASHBOARD_API_KEY');
    setUserApiKey('');
    loadData();
    setShowKeyInput(false);
  };

  // 모든 채널의 비디오를 하나의 목록으로 통합 후 날짜 내림차순 정렬
  const getAllVideos = (): (VideoItem & { channelName: string; channelLogo: string; isCompany: boolean; handle: string })[] => {
    const all: any[] = [];
    channels.forEach(ch => {
      ch.videos.forEach(v => {
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

  const filteredVideos = getAllVideos().filter(v => {
    if (activeTab === 'all') return true;
    return v.type === activeTab;
  });

  // 이번 주 업로드 영상 통계 계산 (일반 동영상 / 쇼츠 구분)
  const getUploadStats = (channel: ChannelInfo) => {
    const videos = channel.videos.filter(v => v.type === 'video').length;
    const shorts = channel.videos.filter(v => v.type === 'shorts').length;
    return { videos, shorts, total: videos + shorts };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 헤더 영역 */}
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

          <div className="flex flex-wrap items-center gap-3">
            {/* 주간 보고 범위 노출 */}
            <div className="bg-slate-100 text-slate-600 text-xs px-3 py-2 rounded-lg font-medium">
              📅 리포팅 주간: <span className="font-semibold text-slate-800">{reportingRange || '날짜 계산 중...'}</span>
            </div>

            {/* 수집 모드 배지 */}
            {isMock ? (
              <span className="bg-amber-50 text-amber-700 border border-amber-200/60 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                데모 데이터 모드
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                실시간 YouTube 연동
              </span>
            )}

            {/* API Key 설정 버튼 */}
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              🔑 {userApiKey ? 'API Key 변경' : '실시간 연동'}
            </button>
          </div>
        </div>
        
        {/* API Key 입력 팝업형 배너 */}
        {showKeyInput && (
          <div className="bg-slate-100 border-t border-slate-200 p-4">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="password"
                placeholder="Google Cloud YouTube Data API Key를 입력하세요"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kodex-navy"
              />
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleSaveApiKey}
                  className="w-full sm:w-auto bg-kodex-navy text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  적용
                </button>
                {localStorage.getItem('KODEX_DASHBOARD_API_KEY') && (
                  <button
                    onClick={handleClearApiKey}
                    className="w-full sm:w-auto bg-white border border-slate-300 text-slate-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    초기화
                  </button>
                )}
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="w-full sm:w-auto text-slate-400 text-sm hover:text-slate-600 px-2 py-2"
                >
                  닫기
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-slate-500 mt-2">
              입력하신 API Key는 서버에 전송되지 않으며, 사용자 본인의 브라우저 안전 영역(LocalStorage)에만 저장됩니다.
            </p>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {loading ? (
          /* 로딩 스켈레톤 UI */
          <div className="space-y-10 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white h-44 rounded-2xl border border-slate-100"></div>
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
                  const stats = getUploadStats(channel);
                  
                  return channel.isCompany ? (
                    /* KODEX 자사 카드 - 압도적인 시각화 */
                    <div 
                      key={channel.id} 
                      className="bg-white border-2 border-kodex-navy rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-48 transition-all duration-300 hover:shadow-lg"
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
                          <p className="text-[11px] text-slate-400 font-medium leading-none">이번 주 업로드</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-2xl font-black text-kodex-navy tracking-tight">{stats.total}건</p>
                            <span className="text-[10px] text-slate-500 font-medium">
                              (동영상 {stats.videos} / 쇼츠 {stats.shorts})
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 백그라운드 KODEX 네이비 포인트 */}
                      <div className="absolute right-0 top-0 h-full w-1.5 bg-kodex-navy"></div>
                    </div>
                  ) : (
                    /* 경쟁사 카드 - 차분하게 톤다운 처리 */
                    <div 
                      key={channel.id} 
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-48 transition-all duration-300 hover:shadow-md"
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
                          <p className="text-[11px] text-slate-400 font-medium leading-none">이번 주 업로드</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-xl font-bold text-slate-600 tracking-tight">{stats.total}건</p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              (동영상 {stats.videos} / 쇼츠 {stats.shorts})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* [섹션 2] 상세 분석 테이블 */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1 h-4 bg-kodex-navy rounded-full"></span>
                  콘텐츠 업로드 상세 현황
                </h2>

                {/* 필터링 탭 */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start sm:self-auto border border-slate-200/50">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      activeTab === 'all'
                        ? 'bg-white text-kodex-navy shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    전체 보기
                  </button>
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      activeTab === 'video'
                        ? 'bg-white text-kodex-navy shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    동영상만 보기
                  </button>
                  <button
                    onClick={() => setActiveTab('shorts')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      activeTab === 'shorts'
                        ? 'bg-white text-kodex-navy shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Shorts만 보기
                  </button>
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
                            해당 주간에 등록된 영상 내역이 존재하지 않습니다.
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
