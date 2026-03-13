import { NumberAnalysis } from '../types';

// 소수 판별 함수
function isPrime(num: number): boolean {
  if (num < 2) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;

  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

// 숫자의 각 자릿수 추출
function getDigits(num: number): number[] {
  return num.toString().split('').map(Number);
}

// 통계 계산
function calculateStatistics(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const n = numbers.length;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2
    : sorted[Math.floor(n/2)];

  // 최빈값 계산
  const frequency: Record<number, number> = {};
  numbers.forEach(num => {
    frequency[num] = (frequency[num] || 0) + 1;
  });
  const mode = Object.keys(frequency).reduce((a, b) =>
    frequency[Number(a)] > frequency[Number(b)] ? a : b
  );

  const range = Math.max(...numbers) - Math.min(...numbers);
  const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);

  // 평균 ± 표준편차 × 1.5 범위를 벗어나는 숫자 분석
  const lowerBound = mean - (standardDeviation * 1.5);
  const upperBound = mean + (standardDeviation * 1.5);
  let outOfRangeCount = 0;
  let aboveUpperBoundCount = 0;
  let belowLowerBoundCount = 0;

  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    if (typeof num !== 'number' || isNaN(num)) continue;
    if (num < lowerBound) {
      belowLowerBoundCount++;
      outOfRangeCount++;
    } else if (num > upperBound) {
      aboveUpperBoundCount++;
      outOfRangeCount++;
    }
  }

  const outOfRangeRatio = outOfRangeCount / n;
  const aboveUpperBoundRatio = aboveUpperBoundCount / n;
  const belowLowerBoundRatio = belowLowerBoundCount / n;

  return {
    mean, median, mode: Number(mode), range, standardDeviation,
    outOfRangeCount, outOfRangeRatio, aboveUpperBoundCount, aboveUpperBoundRatio,
    belowLowerBoundCount, belowLowerBoundRatio, lowerBound, upperBound
  };
}

function analyzeDistribution(numbers: number[]) {
  const digitFrequency: Record<string, number> = {};
  let evenCount = 0;
  let primeCount = 0;
  numbers.forEach(num => {
    getDigits(num).forEach(digit => {
      digitFrequency[digit.toString()] = (digitFrequency[digit.toString()] || 0) + 1;
    });
    if (num % 2 === 0) evenCount++;
    if (isPrime(num)) primeCount++;
  });
  return { digitFrequency, evenOddRatio: evenCount / (numbers.length - evenCount), primeCount };
}

function analyzePatterns(numbers: number[]) {
  let consecutiveDigits = 0, repeatedDigits = 0, ascendingSequence = 0, descendingSequence = 0;
  numbers.forEach(num => {
    const digits = getDigits(num);
    for (let i = 0; i < digits.length - 1; i++) {
      if (Math.abs(digits[i] - digits[i + 1]) === 1) consecutiveDigits++;
    }
    if (new Set(digits).size < digits.length) repeatedDigits++;
    let isAsc = true, isDesc = true;
    for (let i = 0; i < digits.length - 1; i++) {
      if (digits[i] >= digits[i + 1]) isAsc = false;
      if (digits[i] <= digits[i + 1]) isDesc = false;
    }
    if (isAsc) ascendingSequence++;
    if (isDesc) descendingSequence++;
  });
  return { consecutiveDigits, repeatedDigits, ascendingSequence: ascendingSequence > 0, descendingSequence: descendingSequence > 0 };
}

function predictNext(numbers: number[]): { nextNumber: number; confidence: number; trend: 'increasing' | 'decreasing' | 'stable' } {
  if (numbers.length < 2) return { nextNumber: Math.floor(Math.random() * 1000000), confidence: 0.1, trend: 'stable' };
  const recentNumbers = numbers.slice(-10);
  const changes: number[] = [];
  for (let i = 1; i < recentNumbers.length; i++) changes.push(recentNumbers[i] - recentNumbers[i - 1]);
  const avgChange = changes.reduce((s, c) => s + c, 0) / changes.length;
  const lastNumber = numbers[numbers.length - 1];
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (avgChange > 1000) trend = 'increasing';
  else if (avgChange < -1000) trend = 'decreasing';
  let nextNumber = Math.max(0, Math.min(999999, Math.round(lastNumber + avgChange)));
  const variance = changes.reduce((s, c) => s + Math.pow(c - avgChange, 2), 0) / changes.length;
  const confidence = Math.max(0.1, Math.min(0.9, 1 - (variance / 1000000)));
  return { nextNumber, confidence, trend };
}

export function analyzeNumbers(inputNumbers: number[]): NumberAnalysis {
  return {
    input: inputNumbers[inputNumbers.length - 1] || 0,
    statistics: calculateStatistics(inputNumbers),
    distribution: analyzeDistribution(inputNumbers),
    patterns: analyzePatterns(inputNumbers),
    predictions: predictNext(inputNumbers)
  };
}
