'use client';

import { useState } from 'react';
import { LotteryData, analyzePositionFrequency, analyzeDigitSum, analyzeDuplicatePatterns, analyzeDuplicatePositionPatterns, analyzeDuplicateFrequency, analyzePreviousRoundComparison, analyzePositionTransition, analyzeFirstDigitComparison } from '../lib/dataParser';
import { Sparkles, RefreshCw, Dice6, TrendingUp, TrendingDown } from 'lucide-react';

interface PredictionGeneratorProps {
  lotteryData: LotteryData[];
  analyzedNumbers?: number[]; // 현재 분석에 사용된 숫자 배열 (보너스 포함 여부 반영)
}

export interface PredictionOptions {
  /** 사용자가 선택한 배치 패턴 (예: 'OXXXXO'). null이면 자동(가중치 랜덤) */
  selectedPattern?: string | null;
  /** 사용자가 선택한 중복 숫자 (0~9). null이면 자동(가중치 랜덤) */
  selectedDuplicateDigit?: number | null;
}

/**
 * 분석 결과를 기반으로 랜덤 숫자 생성
 * @param options.selectedPattern - 지정 시 2개 중복 + 해당 배치 패턴으로 생성
 * @param options.selectedDuplicateDigit - 지정 시 중복될 숫자로 사용
 */
function generatePrediction(lotteryData: LotteryData[], options?: PredictionOptions): number[] {
  if (lotteryData.length === 0) {
    // 데이터가 없으면 완전 랜덤
    return Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
  }

  const positionFreq = analyzePositionFrequency(lotteryData);
  const sumAnalysis = analyzeDigitSum(lotteryData);
  const duplicateAnalysis = analyzeDuplicatePatterns(lotteryData);
  const positionPatternAnalysis = analyzeDuplicatePositionPatterns(lotteryData);
  const duplicateFrequencyAnalysis = analyzeDuplicateFrequency(lotteryData);
  const previousComparison = analyzePreviousRoundComparison(lotteryData);
  const positionTransition = analyzePositionTransition(lotteryData);

  // 마지막 회차의 combinedNumber 가져오기
  const sortedData = [...lotteryData].sort((a, b) => b.order - a.order);
  const lastRoundNumber = sortedData.length > 0 ? sortedData[0].combinedNumber : null;
  const lastRoundDigits = sortedData.length > 0 ? sortedData[0].numbers : null; // 마지막 회차의 각 자리 숫자

  // 목표 합계 (평균과 최빈값의 중간값 근처)
  const targetSum = Math.round((sumAnalysis.statistics.avgSum + sumAnalysis.statistics.modeSum) / 2);
  
  // 변화량 범위 (최소/최대 차이)
  const minChange = previousComparison.changeStatistics.minChange;
  const maxChange = previousComparison.changeStatistics.maxChange;
  
  // 중복 빈도 패턴 선택 (0개, 2개, 3개, 4개, 5개, 6개 중복)
  const frequencyWeights = [
    { frequency: 0, weight: duplicateFrequencyAnalysis.frequencyDistribution[0] || 0 },
    { frequency: 2, weight: duplicateFrequencyAnalysis.frequencyDistribution[2] || 0 },
    { frequency: 3, weight: duplicateFrequencyAnalysis.frequencyDistribution[3] || 0 },
    { frequency: 4, weight: duplicateFrequencyAnalysis.frequencyDistribution[4] || 0 },
    { frequency: 5, weight: duplicateFrequencyAnalysis.frequencyDistribution[5] || 0 },
    { frequency: 6, weight: duplicateFrequencyAnalysis.frequencyDistribution[6] || 0 }
  ];
  
  const totalFrequencyWeight = frequencyWeights.reduce((sum, f) => sum + f.weight, 0);
  let frequencyRandom = totalFrequencyWeight > 0 ? Math.random() * totalFrequencyWeight : Math.random() * 6;
  let selectedFrequency = 0;
  
  if (totalFrequencyWeight > 0) {
    for (const { frequency, weight } of frequencyWeights) {
      frequencyRandom -= weight;
      if (frequencyRandom <= 0) {
        selectedFrequency = frequency;
        break;
      }
    }
  } else {
    // 가중치가 없으면 랜덤 선택
    const frequencies = [0, 2, 3, 4, 5, 6];
    selectedFrequency = frequencies[Math.floor(Math.random() * frequencies.length)];
  }
  
  // 사용자가 배치 패턴을 지정했으면 2중복 + 배치 패턴 모드로 고정
  const forcePattern = options?.selectedPattern != null && options.selectedPattern !== '';
  const validPattern = forcePattern && positionPatternAnalysis.patternDetails.some(p => p.pattern === options!.selectedPattern);
  
  // 배치 패턴을 고려한 숫자 생성 (1개 중복 패턴은 selectedFrequency가 2일 때만, 또는 사용자가 패턴 지정 시)
  const usePositionPattern = (validPattern || (selectedFrequency === 2 && Math.random() < 0.5)) && positionPatternAnalysis.patternDetails.length > 0;
  const effectiveFrequency = validPattern ? 2 : selectedFrequency;
  
  let generatedDigits: number[];
  
  if (usePositionPattern) {
    // 배치 패턴 기반 생성
    let selectedPattern: string;
    if (validPattern && options!.selectedPattern) {
      selectedPattern = options!.selectedPattern;
    } else {
      // 패턴 빈도를 가중치로 사용하는 룰렛 휠 방식 (빈도가 높을수록 더 잘 선택됨)
      const patternWeights = positionPatternAnalysis.patternDetails.map(p => ({
        pattern: p.pattern,
        weight: p.count
      }));
      const totalPatternWeight = patternWeights.reduce((sum, p) => sum + p.weight, 0);
      let patternRandom = Math.random() * totalPatternWeight;
      selectedPattern = patternWeights[0].pattern;
      for (const { pattern, weight } of patternWeights) {
        patternRandom -= weight;
        if (patternRandom <= 0) {
          selectedPattern = pattern;
          break;
        }
      }
    }
    
    // 중복될 숫자 선택: 사용자 지정 또는 1개 중복 숫자 빈도 순위 기반 룰렛 휠
    let duplicateDigit: number;
    const userDigit = options?.selectedDuplicateDigit;
    if (userDigit !== undefined && userDigit !== null && userDigit >= 0 && userDigit <= 9) {
      duplicateDigit = userDigit;
    } else {
      const singleDuplicateWeights = duplicateAnalysis.singleDuplicateDigitRanking.map(item => ({
        digit: parseInt(item.digit),
        weight: item.count
      }));
      const totalDuplicateWeight = singleDuplicateWeights.reduce((sum, d) => sum + d.weight, 0);
      let duplicateRandom = totalDuplicateWeight > 0 ? Math.random() * totalDuplicateWeight : Math.random() * 10;
      duplicateDigit = 0;
      if (singleDuplicateWeights.length > 0) {
        for (const { digit, weight } of singleDuplicateWeights) {
          duplicateRandom -= weight;
          if (duplicateRandom <= 0) {
            duplicateDigit = digit;
            break;
          }
        }
      } else {
        duplicateDigit = Math.floor(Math.random() * 10);
      }
    }
    
    // 패턴에 따라 숫자 배치
    generatedDigits = Array(6).fill(-1);
    const patternChars = selectedPattern.split('');
    
    // 패턴의 O 위치에 중복 숫자 배치
    const oPositions: number[] = [];
    patternChars.forEach((char, index) => {
      if (char === 'O') {
        oPositions.push(index);
        generatedDigits[index] = duplicateDigit;
      }
    });
    
    // X 위치에 각 자리별 빈도와 전이 패턴을 고려한 숫자 배치
    for (let pos = 0; pos < 6; pos++) {
      if (generatedDigits[pos] === -1) {
        const posData = positionFreq[pos];
        const weights: { digit: number; weight: number }[] = [];
        
        // 전이 패턴 가중치 가져오기
        const transitionData = positionTransition.positionTransitions.find(pt => pt.position === pos + 1);
        const prevDigit = lastRoundDigits ? lastRoundDigits[pos] : null;
        const transitionProb = prevDigit !== null && transitionData 
          ? transitionData.transitionProbabilities[prevDigit] || {}
          : {};
        
        // 중복 숫자 제외하고 가중치 계산
        for (let digit = 0; digit <= 9; digit++) {
          if (digit !== duplicateDigit) {
            const freq = posData.digitFrequency[digit] || 0;
            // 전이 패턴 확률 (0~1 범위, 없으면 0.1 기본값)
            const transitionWeight = transitionProb[digit] || 0.1;
            // 빈도와 전이 패턴을 조합한 가중치 (전이 패턴을 더 중요하게 반영)
            const combinedWeight = (freq + 1) * (1 + transitionWeight * 5); // 전이 패턴에 5배 가중치
            weights.push({
              digit,
              weight: combinedWeight
            });
          }
        }
        
        // 가중치에 따라 숫자 선택
        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const { digit, weight } of weights) {
          random -= weight;
          if (random <= 0) {
            generatedDigits[pos] = digit;
            break;
          }
        }
      }
    }
  } else {
    // 중복 빈도에 따라 숫자 생성
    if (effectiveFrequency === 0) {
      // 중복 없음: 모든 숫자가 다름
      const usedDigits = new Set<number>();
      generatedDigits = [];
      
      for (let pos = 0; pos < 6; pos++) {
        const posData = positionFreq[pos];
        const weights: { digit: number; weight: number }[] = [];
        
        // 전이 패턴 가중치 가져오기
        const transitionData = positionTransition.positionTransitions.find(pt => pt.position === pos + 1);
        const prevDigit = lastRoundDigits ? lastRoundDigits[pos] : null;
        const transitionProb = prevDigit !== null && transitionData 
          ? transitionData.transitionProbabilities[prevDigit] || {}
          : {};
        
        // 사용되지 않은 숫자만 가중치 계산
        for (let digit = 0; digit <= 9; digit++) {
          if (!usedDigits.has(digit)) {
            const freq = posData.digitFrequency[digit] || 0;
            // 전이 패턴 확률 (0~1 범위, 없으면 0.1 기본값)
            const transitionWeight = transitionProb[digit] || 0.1;
            // 빈도와 전이 패턴을 조합한 가중치 (전이 패턴을 더 중요하게 반영)
            const combinedWeight = (freq + 1) * (1 + transitionWeight * 5); // 전이 패턴에 5배 가중치
            weights.push({
              digit,
              weight: combinedWeight
            });
          }
        }
        
        // 가중치에 따라 숫자 선택
        if (weights.length > 0) {
          const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
          let random = Math.random() * totalWeight;
          
          for (const { digit, weight } of weights) {
            random -= weight;
            if (random <= 0) {
              generatedDigits.push(digit);
              usedDigits.add(digit);
              break;
            }
          }
        } else {
          // 모든 숫자를 사용한 경우 랜덤 선택
          const availableDigits = Array.from({ length: 10 }, (_, i) => i).filter(d => !usedDigits.has(d));
          if (availableDigits.length > 0) {
            const digit = availableDigits[Math.floor(Math.random() * availableDigits.length)];
            generatedDigits.push(digit);
            usedDigits.add(digit);
          } else {
            generatedDigits.push(Math.floor(Math.random() * 10));
          }
        }
      }
    } else {
      // selectedFrequency 개의 중복을 가지는 숫자 생성
      // 중복될 숫자 선택: 사용자 지정 또는 각 자리별 빈도 기반
      const duplicateDigit = (() => {
        const userDigit = options?.selectedDuplicateDigit;
        if (userDigit !== undefined && userDigit !== null && userDigit >= 0 && userDigit <= 9) {
          return userDigit;
        }
        const posData = positionFreq[0]; // 첫 번째 자리 기준으로 선택
        const weights: { digit: number; weight: number }[] = [];
        
        for (let digit = 0; digit <= 9; digit++) {
          const freq = posData.digitFrequency[digit] || 0;
          weights.push({
            digit,
            weight: freq + 1
          });
        }
        
        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const { digit, weight } of weights) {
          random -= weight;
          if (random <= 0) {
            return digit;
          }
        }
        return Math.floor(Math.random() * 10);
      })();
      
      // 중복 위치 선택
      const duplicatePositions = new Set<number>();
      while (duplicatePositions.size < effectiveFrequency) {
        duplicatePositions.add(Math.floor(Math.random() * 6));
      }
      
      // 숫자 생성
      generatedDigits = Array(6).fill(-1);
      
      // 중복 위치에 중복 숫자 배치
      duplicatePositions.forEach(pos => {
        generatedDigits[pos] = duplicateDigit;
      });
      
      // 나머지 위치에 각 자리별 빈도와 전이 패턴을 고려한 숫자 배치
      for (let pos = 0; pos < 6; pos++) {
        if (generatedDigits[pos] === -1) {
          const posData = positionFreq[pos];
          const weights: { digit: number; weight: number }[] = [];
          
          // 전이 패턴 가중치 가져오기
          const transitionData = positionTransition.positionTransitions.find(pt => pt.position === pos + 1);
          const prevDigit = lastRoundDigits ? lastRoundDigits[pos] : null;
          const transitionProb = prevDigit !== null && transitionData 
            ? transitionData.transitionProbabilities[prevDigit] || {}
            : {};
          
          // 중복 숫자 제외하고 가중치 계산
          for (let digit = 0; digit <= 9; digit++) {
            if (digit !== duplicateDigit) {
              const freq = posData.digitFrequency[digit] || 0;
              // 전이 패턴 확률 (0~1 범위, 없으면 0.1 기본값)
              const transitionWeight = transitionProb[digit] || 0.1;
              // 빈도와 전이 패턴을 조합한 가중치 (전이 패턴을 더 중요하게 반영)
              const combinedWeight = (freq + 1) * (1 + transitionWeight * 5); // 전이 패턴에 5배 가중치
              weights.push({
                digit,
                weight: combinedWeight
              });
            }
          }
          
          // 가중치에 따라 숫자 선택
          if (weights.length > 0) {
            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const { digit, weight } of weights) {
              random -= weight;
              if (random <= 0) {
                generatedDigits[pos] = digit;
                break;
              }
            }
          } else {
            generatedDigits[pos] = Math.floor(Math.random() * 10);
          }
        }
      }
    }
  }
  
  // 사용자가 배치 패턴 또는 중복 숫자를 지정했으면, 이후 합계/직전회차 조정을 하지 않아 선택이 유지되도록 함
  const userSpecifiedOptions = (options?.selectedPattern != null && options.selectedPattern !== '') ||
    (options?.selectedDuplicateDigit != null && options.selectedDuplicateDigit >= 0 && options.selectedDuplicateDigit <= 9);

  if (!userSpecifiedOptions) {
    let currentSum = generatedDigits.reduce((sum, d) => sum + d, 0);

    // 합계 조정 (목표 합계에 근접하도록)
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts && Math.abs(currentSum - targetSum) > 3; attempt++) {
      const diff = targetSum - currentSum;
      const adjustCount = Math.min(Math.abs(diff), 6);

      for (let i = 0; i < adjustCount; i++) {
        const randomPos = Math.floor(Math.random() * 6);
        const oldDigit = generatedDigits[randomPos];

        if (diff > 0) {
          if (oldDigit < 9) {
            generatedDigits[randomPos] = Math.min(9, oldDigit + 1);
          }
        } else {
          if (oldDigit > 0) {
            generatedDigits[randomPos] = Math.max(0, oldDigit - 1);
          }
        }
      }

      currentSum = generatedDigits.reduce((sum, d) => sum + d, 0);
      if (Math.abs(currentSum - targetSum) <= 3) break;
    }

    // 합계가 여전히 범위를 벗어나면 재조정
    if (currentSum < 0 || currentSum > 54) {
      generatedDigits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
    }

    // 마지막 회차와의 차이 범위 제한
    const stdDeviation = previousComparison.changeStatistics.stdDeviation;
    const sortedDataForAvg = [...lotteryData].sort((a, b) => a.order - b.order);
    const allChangesForAvg: number[] = [];
    for (let i = 1; i < sortedDataForAvg.length; i++) {
      const change = sortedDataForAvg[i].combinedNumber - sortedDataForAvg[i - 1].combinedNumber;
      allChangesForAvg.push(change);
    }
    const avgAllChange = allChangesForAvg.length > 0
      ? allChangesForAvg.reduce((sum, val) => sum + val, 0) / allChangesForAvg.length
      : 0;
    const stdDevMultiplier = 1.5;
    const stdDevLowerBound = avgAllChange - (stdDeviation * stdDevMultiplier);
    const stdDevUpperBound = avgAllChange + (stdDeviation * stdDevMultiplier);
    const effectiveLowerBound = Math.max(minChange, stdDevLowerBound);
    const effectiveUpperBound = Math.min(maxChange, stdDevUpperBound);

    if (lastRoundNumber !== null && sortedData.length > 0 && previousComparison.totalComparisons > 0 && stdDeviation > 0) {
      const generatedNumber = parseInt(generatedDigits.map(d => d.toString()).join('').padStart(6, '0'));
      const difference = generatedNumber - lastRoundNumber;

      if (difference < effectiveLowerBound || difference > effectiveUpperBound) {
        const targetDifference = Math.round(avgAllChange);
        const targetNumber = lastRoundNumber + targetDifference;
        const targetString = Math.max(0, Math.min(999999, targetNumber)).toString().padStart(6, '0');
        const targetDigits = targetString.split('').map(Number);
        const targetCombinedNumber = parseInt(targetDigits.map(d => d.toString()).join('').padStart(6, '0'));
        const targetDiff = targetCombinedNumber - lastRoundNumber;

        if (targetDigits.every(d => d >= 0 && d <= 9) && targetDiff >= effectiveLowerBound && targetDiff <= effectiveUpperBound) {
          generatedDigits = targetDigits;
        } else {
          for (let attempt = 0; attempt < 100; attempt++) {
            const randomDiffValue = Math.floor(Math.random() * (effectiveUpperBound - effectiveLowerBound + 1)) + effectiveLowerBound;
            const randomTargetNumber = lastRoundNumber + randomDiffValue;
            const randomTargetString = Math.max(0, Math.min(999999, randomTargetNumber)).toString().padStart(6, '0');
            const randomTargetDigits = randomTargetString.split('').map(Number);

            if (randomTargetDigits.every(d => d >= 0 && d <= 9)) {
              const randomCombinedNumber = parseInt(randomTargetDigits.map(d => d.toString()).join('').padStart(6, '0'));
              const actualDiff = randomCombinedNumber - lastRoundNumber;
              if (actualDiff >= effectiveLowerBound && actualDiff <= effectiveUpperBound) {
                generatedDigits = randomTargetDigits;
                break;
              }
            }
          }
        }
      }
    }
  }

  return generatedDigits;
}

export default function PredictionGenerator({ lotteryData, analyzedNumbers }: PredictionGeneratorProps) {
  const [predictedNumbers, setPredictedNumbers] = useState<number[] | null>(null);
  const [predictionSum, setPredictionSum] = useState<number | null>(null);
  const [predictionPattern, setPredictionPattern] = useState<string | null>(null);
  const [patternCount, setPatternCount] = useState<number | null>(null);
  const [patternPercentage, setPatternPercentage] = useState<number | null>(null);
  const [patternRank, setPatternRank] = useState<number | null>(null); // 배치 패턴 순위
  const [patternTotalCount, setPatternTotalCount] = useState<number | null>(null); // 전체 패턴 개수
  const [digitDuplicateProbability, setDigitDuplicateProbability] = useState<number | null>(null);
  const [duplicateDigitRank, setDuplicateDigitRank] = useState<number | null>(null); // 중복 숫자 순위
  const [duplicateDigitTotalCount, setDuplicateDigitTotalCount] = useState<number | null>(null); // 전체 중복 숫자 개수
  const [duplicateDigit, setDuplicateDigit] = useState<number | null>(null); // 중복된 숫자
  const [digitProbabilities, setDigitProbabilities] = useState<number[]>([]);
  const [transitionProbabilities, setTransitionProbabilities] = useState<number[]>([]); // 각 자리별 전이 확률
  const [lastRoundDigits, setLastRoundDigits] = useState<number[] | null>(null); // 직전 회차의 각 자리 숫자
  const [isGenerating, setIsGenerating] = useState(false);
  /** 사용자 선택: 배치 패턴 (null = 자동) */
  const [selectedPatternOption, setSelectedPatternOption] = useState<string | null>(null);
  /** 사용자 선택: 중복 숫자 (null = 자동) */
  const [selectedDuplicateDigitOption, setSelectedDuplicateDigitOption] = useState<number | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // analyzedNumbers가 있으면, 현재 분석 결과와 동일한 데이터를 사용
      // analyzedNumbers는 보너스 포함 여부가 반영된 숫자 배열
      // 보너스 포함 여부를 확인하기 위해 numbers.length와 lotteryData.length를 비교
      const includeBonus = analyzedNumbers && analyzedNumbers.length > 0 
        ? analyzedNumbers.length >= lotteryData.length * 1.5 // 보너스 포함 시 대략 2배
        : false;
      
      // 보너스 포함 여부에 관계없이, 현재 분석에 사용된 lotteryData를 그대로 사용
      // (lotteryData는 이미 현재 분석에 사용된 데이터이므로)
      const numbers = generatePrediction(lotteryData, {
        selectedPattern: selectedPatternOption,
        selectedDuplicateDigit: selectedDuplicateDigitOption
      });
      const sum = numbers.reduce((s, n) => s + n, 0);
      
      // 생성된 숫자의 패턴 분석
      const digitCount: Record<number, number> = {};
      numbers.forEach(d => {
        digitCount[d] = (digitCount[d] || 0) + 1;
      });
      
      const duplicates = Object.entries(digitCount).filter(([_, count]) => count >= 2);
      let pattern: string | null = null;
      let patternCount: number | null = null;
      let patternPercentage: number | null = null;
      let patternRank: number | null = null;
      let patternTotalCount: number | null = null;
      let digitDuplicateProbability: number | null = null;
      let duplicateDigitRank: number | null = null;
      let duplicateDigitTotalCount: number | null = null;
      let duplicateDigit: number | null = null;
      
      // 중복 패턴 분석을 위해 전체 데이터 분석
      const duplicateAnalysis = analyzeDuplicatePatterns(lotteryData);
      const totalCount = lotteryData.length;
      
      if (duplicates.length === 0) {
        // 중복 없음 비율
        const count = duplicateAnalysis.duplicateCountDistribution[0] || 0;
        patternCount = count;
        patternPercentage = duplicateAnalysis.duplicateCountRatio[0] ? duplicateAnalysis.duplicateCountRatio[0] * 100 : null;
        digitDuplicateProbability = null;
        duplicateDigitRank = null;
        duplicateDigitTotalCount = null;
        duplicateDigit = null;
        pattern = 'XXXXXX'; // 중복 숫자가 없는 패턴
        patternRank = null;
        patternTotalCount = null;
      } else if (duplicates.length === 1) {
        const currentDuplicateDigit = parseInt(duplicates[0][0]);
        duplicateDigit = currentDuplicateDigit;
        const duplicateCount = digitCount[currentDuplicateDigit];
        
        // 해당 숫자의 중복 확률 계산 (1개 중복으로 나타난 횟수)
        const digitRankingIndex = duplicateAnalysis.singleDuplicateDigitRanking.findIndex(
          item => item.digit === currentDuplicateDigit.toString()
        );
        if (digitRankingIndex !== -1) {
          digitDuplicateProbability = (duplicateAnalysis.singleDuplicateDigitRanking[digitRankingIndex].count / totalCount) * 100;
          duplicateDigitRank = digitRankingIndex + 1; // 1부터 시작하는 순위
          duplicateDigitTotalCount = duplicateAnalysis.singleDuplicateDigitRanking.length;
        } else {
          duplicateDigitRank = null;
          duplicateDigitTotalCount = null;
        }
        
        if (duplicateCount === 2) {
          // 1개 숫자가 정확히 2번 중복
          pattern = numbers.map(d => d === currentDuplicateDigit ? 'O' : 'X').join('');
          
          // 해당 패턴의 카운트와 비율 찾기
          const positionPatternAnalysis = analyzeDuplicatePositionPatterns(lotteryData);
          const patternDataIndex = positionPatternAnalysis.patternDetails.findIndex(p => p.pattern === pattern);
          if (patternDataIndex !== -1) {
            const patternData = positionPatternAnalysis.patternDetails[patternDataIndex];
            patternCount = patternData.count;
            patternPercentage = patternData.percentage;
            patternRank = patternDataIndex + 1; // 1부터 시작하는 순위
            patternTotalCount = positionPatternAnalysis.patternDetails.length;
          } else {
            // 전체 1개 중복 비율
            const count = duplicateAnalysis.duplicateCountDistribution[1] || 0;
            patternCount = count;
            patternPercentage = duplicateAnalysis.duplicateCountRatio[1] ? duplicateAnalysis.duplicateCountRatio[1] * 100 : null;
            patternRank = null;
            patternTotalCount = null;
          }
        } else {
          // 1개 숫자가 3번 이상 중복
          pattern = numbers.map(d => d === currentDuplicateDigit ? 'O' : 'X').join('');
          // 기타 패턴 비율
          const count = duplicateAnalysis.duplicateCountDistribution[-1] || 0;
          patternCount = count;
          patternPercentage = duplicateAnalysis.duplicateCountRatio[-1] ? duplicateAnalysis.duplicateCountRatio[-1] * 100 : null;
          patternRank = null;
          patternTotalCount = null;
        }
      } else if (duplicates.length === 2) {
        // 2개 숫자가 중복
        const duplicate1 = parseInt(duplicates[0][0]);
        const duplicate2 = parseInt(duplicates[1][0]);
        const count1 = digitCount[duplicate1];
        const count2 = digitCount[duplicate2];
        
        // 첫 번째 중복 숫자의 순위 찾기
        const digitRankingIndex1 = duplicateAnalysis.singleDuplicateDigitRanking.findIndex(
          item => item.digit === duplicate1.toString()
        );
        if (digitRankingIndex1 !== -1) {
          duplicateDigit = duplicate1;
          duplicateDigitRank = digitRankingIndex1 + 1;
          duplicateDigitTotalCount = duplicateAnalysis.singleDuplicateDigitRanking.length;
        } else {
          duplicateDigit = null;
          duplicateDigitRank = null;
          duplicateDigitTotalCount = null;
        }
        
        // 패턴 생성 (첫 번째 중복: O, 두 번째 중복: A, 나머지: X)
        pattern = numbers.map(d => {
          if (d === duplicate1) return 'O';
          if (d === duplicate2) return 'A';
          return 'X';
        }).join('');
        
        // 2개 중복 비율 확인
        const digitString = numbers.map(n => n.toString()).join('');
        const digitCountCheck: Record<string, number> = {};
        digitString.split('').forEach(d => {
          digitCountCheck[d] = (digitCountCheck[d] || 0) + 1;
        });
        const duplicateCountCheck = Object.values(digitCountCheck).filter(c => c >= 2).length;
        
        // 기타 패턴인지 확인 (3개 이상 종류 중복이거나, 둘 다 3번 이상)
        const isOthers = duplicateCountCheck >= 3 || (duplicateCountCheck === 2 && count1 >= 3 && count2 >= 3);
        
        if (isOthers) {
          const count = duplicateAnalysis.duplicateCountDistribution[-1] || 0;
          patternCount = count;
          patternPercentage = duplicateAnalysis.duplicateCountRatio[-1] ? duplicateAnalysis.duplicateCountRatio[-1] * 100 : null;
        } else {
          const count = duplicateAnalysis.duplicateCountDistribution[2] || 0;
          patternCount = count;
          patternPercentage = duplicateAnalysis.duplicateCountRatio[2] ? duplicateAnalysis.duplicateCountRatio[2] * 100 : null;
        }
        digitDuplicateProbability = null;
        patternRank = null;
        patternTotalCount = null;
      } else {
        // 3개 이상 중복
        pattern = numbers.map((d, idx) => {
          const count = digitCount[d];
          if (count >= 2) {
            // 중복된 숫자는 O로 표시
            return 'O';
          }
          return 'X';
        }).join('');
        
        // 기타 패턴 비율
        const count = duplicateAnalysis.duplicateCountDistribution[-1] || 0;
        patternCount = count;
        patternPercentage = duplicateAnalysis.duplicateCountRatio[-1] ? duplicateAnalysis.duplicateCountRatio[-1] * 100 : null;
        digitDuplicateProbability = null;
        duplicateDigitRank = null;
        duplicateDigitTotalCount = null;
        duplicateDigit = null;
        patternRank = null;
        patternTotalCount = null;
      }
      
      // 각 자릿수별 확률 계산
      const positionFreq = analyzePositionFrequency(lotteryData);
      const probabilities: number[] = numbers.map((digit, pos) => {
        const posData = positionFreq[pos];
        const count = posData.digitFrequency[digit] || 0;
        const percentage = (count / lotteryData.length) * 100;
        return percentage;
      });
      
      // 각 자리별 전이 확률 계산
      const positionTransition = analyzePositionTransition(lotteryData);
      const sortedData = [...lotteryData].sort((a, b) => b.order - a.order);
      const lastRound = sortedData.length > 0 ? sortedData[0].numbers : null;
      setLastRoundDigits(lastRound);
      
      const transitionProbs: number[] = numbers.map((digit, pos) => {
        if (!lastRound) return 0;
        
        const prevDigit = lastRound[pos];
        const transitionData = positionTransition.positionTransitions.find(pt => pt.position === pos + 1);
        
        if (transitionData && transitionData.transitionProbabilities[prevDigit]) {
          const prob = transitionData.transitionProbabilities[prevDigit][digit] || 0;
          return prob * 100; // 확률을 퍼센트로 변환
        }
        
        return 0;
      });
      
      setPredictedNumbers(numbers);
      setPredictionSum(sum);
      setPredictionPattern(pattern);
      setPatternCount(patternCount);
      setPatternPercentage(patternPercentage);
      setPatternRank(patternRank);
      setPatternTotalCount(patternTotalCount);
      setDigitDuplicateProbability(digitDuplicateProbability);
      setDuplicateDigitRank(duplicateDigitRank);
      setDuplicateDigitTotalCount(duplicateDigitTotalCount);
      setDuplicateDigit(duplicateDigit);
      setDigitProbabilities(probabilities);
      setTransitionProbabilities(transitionProbs);
      setIsGenerating(false);
    }, 300); // 애니메이션 효과를 위한 딜레이
  };

  if (lotteryData.length === 0) {
    return null;
  }

  const sumAnalysis = analyzeDigitSum(lotteryData);
  const positionPatternAnalysis = analyzeDuplicatePositionPatterns(lotteryData);
  const duplicateAnalysisForOptions = analyzeDuplicatePatterns(lotteryData);

  return (
    <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 border-2 border-purple-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
            <Sparkles className="text-purple-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">AI 기반 숫자 예측</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              자릿수 합계, 각 자리별 빈도, 중복 배치 패턴을 기반으로 예측된 숫자
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="p-3 sm:p-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[44px] min-h-[44px] w-full sm:w-auto"
          title={isGenerating ? '생성 중...' : '숫자 생성'}
        >
          {isGenerating ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            <Dice6 size={20} />
          )}
        </button>
      </div>

      {/* 배치 패턴 / 중복 숫자 선택 옵션 */}
      <div className="mb-4 p-3 sm:p-4 bg-white/70 rounded-lg border border-purple-200">
        <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">예측 옵션 (선택 시 해당 항목으로 고정)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="pattern-combo" className="block text-[10px] sm:text-xs text-gray-600 mb-1.5">배치 패턴</label>
            <select
              id="pattern-combo"
              value={selectedPatternOption ?? ''}
              onChange={(e) => setSelectedPatternOption(e.target.value === '' ? null : e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">자동</option>
              {positionPatternAnalysis.patternDetails.map((p) => (
                <option key={p.pattern} value={p.pattern} title={`출현 ${p.count}회, 최근 ${p.absenceCount}회 연속 미출현, ${p.percentage.toFixed(1)}%`}>
                  {p.pattern} (출현 {p.count}회 / 연속 미출현 {p.absenceCount}회)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="digit-combo" className="block text-[10px] sm:text-xs text-gray-600 mb-1.5">중복 숫자</label>
            <select
              id="digit-combo"
              value={selectedDuplicateDigitOption !== null ? String(selectedDuplicateDigitOption) : ''}
              onChange={(e) => setSelectedDuplicateDigitOption(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">자동</option>
              {duplicateAnalysisForOptions.singleDuplicateDigitRanking.map((item) => (
                <option key={item.digit} value={item.digit} title={`출현 ${item.count}회, 최근 ${item.absenceCount}회 연속 미출현`}>
                  {item.digit} (출현 {item.count}회 / 연속 미출현 {item.absenceCount}회)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 맨 앞자리 숫자가 직전보다 클/작을 확률 (과거 데이터 기준) */}
      {(() => {
        const comparison = analyzeFirstDigitComparison(lotteryData);
        const total = comparison.totalComparisons;
        if (total === 0) return null;
        const upPct = (comparison.increaseRatio * 100);
        const downPct = (comparison.decreaseRatio * 100);
        const samePct = (comparison.sameRatio * 100);
        return (
          <div className="mb-4 p-3 sm:p-4 bg-white/70 rounded-lg border border-purple-200">
            <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">맨 앞자리 숫자가 직전보다 클/작을 확률</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-2">첫 번째 자리만 비교, 과거 {total}회 기준</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="text-green-600 shrink-0" size={20} />
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-600">맨 앞자리가 직전보다 클 확률</div>
                  <div className="text-lg sm:text-xl font-bold text-green-600">{upPct.toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="text-red-600 shrink-0" size={20} />
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-600">맨 앞자리가 직전보다 작을 확률</div>
                  <div className="text-lg sm:text-xl font-bold text-red-600">{downPct.toFixed(1)}%</div>
                </div>
              </div>
              {samePct > 0 && (
                <div className="flex items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-2 sm:col-span-1">
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-600">맨 앞자리가 직전과 동일할 확률</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-600">{samePct.toFixed(1)}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {predictedNumbers && (
        <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-white rounded-lg border-2 border-purple-300">
          <div className="mb-4">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 mb-2 flex-wrap">
              {predictedNumbers.map((num, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl lg:text-2xl font-bold shadow-lg animate-pulse"
                  >
                    {num}
                  </div>
                  {digitProbabilities[index] !== undefined && (
                    <div className="mt-1 text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-600">
                      {digitProbabilities[index].toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 직전 회차 정보 및 전이 확률 */}
            {lastRoundDigits && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 text-center">
                  직전 회차 대비 전이 확률
                </div>
                {/* 데스크톱: 가로 배치 */}
                <div className="hidden md:grid md:grid-cols-6 gap-2">
                  {predictedNumbers.map((num, index) => {
                    const prevDigit = lastRoundDigits[index];
                    const transitionProb = transitionProbabilities[index] || 0;
                    
                    return (
                      <div key={index} className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          {index + 1}번째
                        </div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="text-sm font-bold text-gray-700">{prevDigit}</span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className="text-sm font-bold text-indigo-600">{num}</span>
                        </div>
                        <div className={`text-xs font-bold ${
                          transitionProb >= 20 ? 'text-green-600' :
                          transitionProb >= 10 ? 'text-yellow-600' :
                          transitionProb >= 5 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {transitionProb.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 모바일/태블릿: 세로 배치 */}
                <div className="md:hidden space-y-1.5 sm:space-y-2">
                  {predictedNumbers.map((num, index) => {
                    const prevDigit = lastRoundDigits[index];
                    const transitionProb = transitionProbabilities[index] || 0;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-indigo-100">
                        <span className="text-xs text-gray-500 w-12 sm:w-16">{index + 1}번째</span>
                        <div className={`flex-1 text-xs sm:text-sm font-bold text-center ${
                          transitionProb >= 20 ? 'text-green-600' :
                          transitionProb >= 10 ? 'text-yellow-600' :
                          transitionProb >= 5 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {prevDigit}→{num} {transitionProb.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-gray-500 text-center px-1">
                  직전 회차 각 자리 숫자에서 생성된 숫자로 전이될 확률
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 text-center">합계 정보</div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">자릿수 합계</div>
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    {predictionSum}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">평균 합계</div>
                  <div className="text-lg sm:text-xl font-bold text-purple-600">
                    {sumAnalysis.statistics.avgSum.toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">합계 차이</div>
                  <div className={`text-lg sm:text-xl font-bold ${Math.abs(predictionSum! - sumAnalysis.statistics.avgSum) <= 5 ? 'text-green-600' : 'text-orange-600'}`}>
                    {predictionSum && (predictionSum - sumAnalysis.statistics.avgSum).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">배치 패턴</div>
              {predictionPattern ? (
                <>
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1 mb-2">
                    <span className="text-base sm:text-lg md:text-xl font-bold text-gray-800 font-mono">
                      {predictionPattern.split('').map((char, i) => {
                        let colorClass = 'text-gray-400';
                        if (char === 'O') colorClass = 'text-red-600';
                        else if (char === 'A') colorClass = 'text-blue-600';
                        return (
                          <span key={i} className={colorClass}>
                            {char}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                  {patternRank !== null && patternTotalCount !== null && (
                    <div className="text-[10px] sm:text-xs font-bold text-purple-600 mt-1">
                      패턴 순위: {patternRank}위 / {patternTotalCount}개 패턴 중
                    </div>
                  )}
                  {duplicateDigit !== null && duplicateDigitRank !== null && duplicateDigitTotalCount !== null && (
                    <div className="text-[10px] sm:text-xs font-bold text-orange-600 mt-1">
                      중복 숫자 {duplicateDigit}: {duplicateDigitRank}위 / {duplicateDigitTotalCount}개 중
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
          
          {predictionSum && (
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-[10px] sm:text-xs text-gray-600 text-center">
                {predictionSum < sumAnalysis.statistics.avgSum - 5 && '⚠️ 합계가 평균보다 낮습니다'}
                {predictionSum >= sumAnalysis.statistics.avgSum - 5 && predictionSum <= sumAnalysis.statistics.avgSum + 5 && '✅ 합계가 평균 범위 내입니다'}
                {predictionSum > sumAnalysis.statistics.avgSum + 5 && '⚠️ 합계가 평균보다 높습니다'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

