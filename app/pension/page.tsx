'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnalysisResults from './components/AnalysisResults';
import DataLoader from './components/DataLoader';
import LotteryDataDisplay from './components/LotteryDataDisplay';
import TrendChart from './components/TrendChart';
import TrendAnalysis from './components/TrendAnalysis';
import DuplicatePatternAnalysis from './components/DuplicatePatternAnalysis';
import PositionTransitionAnalysis from './components/PositionTransitionAnalysis';
import PredictionGenerator from './components/PredictionGenerator';
import DataAdder from './components/DataAdder';
import { analyzeNumbers } from './lib/analysis';
import { NumberAnalysis } from './types';
import { LotteryData, loadLotteryData } from './lib/dataParser';

export default function PensionPage() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<NumberAnalysis | null>(null);
  const [lotteryData, setLotteryData] = useState<LotteryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataReloadKey, setDataReloadKey] = useState(0);

  const handleDataLoaded = (newNumbers: number[], newLotteryData: LotteryData[]) => {
    setNumbers(newNumbers);
    setLotteryData(newLotteryData);
    if (newNumbers.length > 0) {
      setAnalysis(analyzeNumbers(newNumbers));
    }
  };

  const loadData = async () => {
    try {
      const { parsedData, numbers: nums, statistics } = await loadLotteryData();
      setNumbers(nums);
      setLotteryData(parsedData);
      if (nums.length > 0) {
        setAnalysis(analyzeNumbers(nums));
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (dataReloadKey > 0) {
      loadData();
    }
  }, [dataReloadKey]);

  /** DB/파일 반영 후 데이터·통계 다시 로드 */
  const handleDataReload = () => {
    setIsLoading(true);
    setDataReloadKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-3 py-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              🏠 첫 페이지
            </Link>
            <Link
              href="/lotto"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              🎱 로또 6/45
            </Link>
          </div>
          <span className="text-sm font-medium text-gray-700">연금복권 패턴 분석</span>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
            🎯 연금복권 패턴 분석기
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">
            연금복권 데이터를 분석하여 패턴을 찾고 다음 숫자를 예측해보세요.
          </p>
        </div>

        {!isLoading && lotteryData.length > 0 && (
          <>
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/90 px-4 py-2 text-center text-sm text-indigo-900">
              <strong>로드된 데이터</strong>: 총 <strong>{lotteryData.length}</strong>건 · 최고 회차{" "}
              <strong>{Math.max(...lotteryData.map((d) => Number(d.order)))}</strong>회
              <span className="text-indigo-700/80 ml-2 hidden sm:inline">
                (전이 분석의 &quot;306&quot; 등은 회차 번호가 아니라 <em>인접 회차 쌍 개수</em>일 수 있습니다.)
              </span>
            </div>
            <PredictionGenerator lotteryData={lotteryData} analyzedNumbers={numbers} />
          </>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">연금복권 데이터를 로드하고 분석 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="hidden md:block">
                <DataAdder onDataAdded={handleDataReload} lotteryData={lotteryData} />
              </div>
              <DataLoader
                onDataLoaded={handleDataLoaded}
                onStatisticsLoaded={() => {}}
                lotteryData={lotteryData}
              />
            </div>
            <div className="lg:col-span-2">
              <AnalysisResults analysis={analysis} />
            </div>
          </div>
        )}

        {!isLoading && lotteryData.length > 0 && (
          <div className="mt-8 p-4 rounded-lg border-4 border-green-200 bg-green-50/80">
            <h2 className="text-xl font-bold text-green-800 mb-4">트렌드 차트</h2>
            <TrendChart lotteryData={lotteryData} />
          </div>
        )}

        {lotteryData.length > 0 && (
          <div className="mt-6 lg:mt-8">
            <TrendAnalysis lotteryData={lotteryData} />
          </div>
        )}

        {lotteryData.length > 0 && (
          <div className="mt-6 lg:mt-8">
            <DuplicatePatternAnalysis lotteryData={lotteryData} />
          </div>
        )}

        {lotteryData.length > 0 && (
          <div className="mt-6 lg:mt-8">
            <PositionTransitionAnalysis lotteryData={lotteryData} />
          </div>
        )}

        {lotteryData.length > 0 && (
          <div className="mt-6 lg:mt-8">
            <LotteryDataDisplay lotteryData={lotteryData} />
          </div>
        )}

        <footer className="mt-8 lg:mt-12 text-center text-gray-500 px-2">
          <p className="text-xs sm:text-sm">© 연금복권 패턴 분석기 - Next.js 기반 복권 분석 도구</p>
        </footer>
      </div>
    </main>
  );
}
