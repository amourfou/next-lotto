'use client';

import { useState, useEffect } from 'react';
import AnalysisResults from './components/AnalysisResults';
import DataLoader from './components/DataLoader';
import LotteryDataDisplay from './components/LotteryDataDisplay';
import TrendChart from './components/TrendChart';
import TrendAnalysis from './components/TrendAnalysis';
import DuplicatePatternAnalysis from './components/DuplicatePatternAnalysis';
import PositionTransitionAnalysis from './components/PositionTransitionAnalysis';
import PredictionGenerator from './components/PredictionGenerator';
import DataAdder from './components/DataAdder';
import WinningNumbersList from './components/WinningNumbersList';
import { analyzeNumbers } from './lib/analysis';
import { NumberAnalysis } from './types';
import { LotteryData, loadLotteryData } from './lib/dataParser';

export function PensionPageContent() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<NumberAnalysis | null>(null);
  const [lotteryData, setLotteryData] = useState<LotteryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleDataLoaded = (newNumbers: number[], newLotteryData: LotteryData[]) => {
    setNumbers(newNumbers);
    setLotteryData(newLotteryData);
    if (newNumbers.length > 0) {
      setAnalysis(analyzeNumbers(newNumbers));
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { parsedData, numbers: nums } = await loadLotteryData();
      setNumbers(nums);
      setLotteryData(parsedData);
      if (nums.length > 0) {
        setAnalysis(analyzeNumbers(nums));
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setLoadError(error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDataReload = () => {
    loadData();
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {loadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
            ⚠️ 데이터 로드 실패: {loadError}
            <button
              onClick={() => loadData()}
              className="ml-3 underline font-medium hover:text-red-900"
            >
              다시 시도
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">연금복권 데이터를 로드하고 분석 중...</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
            {/* 왼쪽: 당첨번호 입력 → 당첨번호 리스트 (모바일 포함 항상 표시) */}
            <aside className="w-full xl:w-80 shrink-0 space-y-3 sm:space-y-4">
              <DataAdder onDataAdded={handleDataReload} lotteryData={lotteryData} />
              {lotteryData.length > 0 && (
                <WinningNumbersList lotteryData={lotteryData} />
              )}
            </aside>

            <div className="flex-1 min-w-0 w-full">
              {lotteryData.length > 0 && (
                <PredictionGenerator lotteryData={lotteryData} analyzedNumbers={numbers} />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <div className="space-y-4 sm:space-y-6">
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

              {lotteryData.length > 0 && (
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
          </div>
        )}
      </div>
    </div>
  );
}
