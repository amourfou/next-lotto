// PensionLottery.json 데이터 파싱 함수들

export interface LotteryData {
  order: number;
  numbers: number[];
  combinedNumber: number;
  bonusNumbers?: number[];
  bonusCombinedNumber?: number;
}

/**
 * PensionLottery.json의 원시 데이터를 파싱하여 분석 가능한 형태로 변환
 * @param rawData - JSON 파일의 원시 데이터
 * @returns 파싱된 복권 데이터 배열
 */
export function parseLotteryData(rawData: number[][]): LotteryData[] {
  return rawData.map((row, index) => {
    // 0번째: 순서, 1번째: 조, 2~7번째: 번호, 8~13번째: 보너스번호
    const order = row[0];
    const numbers = row.slice(2, 8); // 2,3,4,5,6,7번째 인덱스
    const bonusNumbers = row.length > 8 ? row.slice(8, 14) : undefined; // 8,9,10,11,12,13번째 인덱스
    
    // 6자리 숫자로 조합 (0~999999 범위)
    const combinedNumber = parseInt(numbers.join(''));
    const bonusCombinedNumber = bonusNumbers ? parseInt(bonusNumbers.join('')) : undefined;
    
    return {
      order,
      numbers,
      combinedNumber,
      bonusNumbers,
      bonusCombinedNumber
    };
  });
}

/**
 * 파싱된 데이터에서 숫자들만 추출
 * @param lotteryData - 파싱된 복권 데이터
 * @param includeBonus - 보너스 번호 포함 여부 (기본값: false)
 * @returns 숫자 배열
 */
export function extractNumbers(lotteryData: LotteryData[], includeBonus: boolean = false): number[] {
  if (includeBonus) {
    const numbers: number[] = [];
    lotteryData.forEach(data => {
      numbers.push(data.combinedNumber);
      if (data.bonusCombinedNumber !== undefined) {
        numbers.push(data.bonusCombinedNumber);
      }
    });
    return numbers;
  }
  return lotteryData.map(data => data.combinedNumber);
}

/**
 * 데이터 통계 정보 계산
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 통계 정보
 */
export function getDataStatistics(lotteryData: LotteryData[]) {
  const numbers = extractNumbers(lotteryData);
  const totalCount = numbers.length;
  const minNumber = Math.min(...numbers);
  const maxNumber = Math.max(...numbers);
  const avgNumber = numbers.reduce((sum, num) => sum + num, 0) / totalCount;
  
  // 자릿수별 분포
  const digitDistribution: Record<string, number> = {};
  numbers.forEach(num => {
    const digits = num.toString().split('');
    digits.forEach(digit => {
      digitDistribution[digit] = (digitDistribution[digit] || 0) + 1;
    });
  });
  
  // 짝수/홀수 분포
  const evenCount = numbers.filter(num => num % 2 === 0).length;
  const oddCount = totalCount - evenCount;
  
  return {
    totalCount,
    minNumber,
    maxNumber,
    avgNumber,
    digitDistribution,
    evenCount,
    oddCount,
    evenOddRatio: evenCount / oddCount
  };
}

/**
 * 최근 N개 데이터 추출
 * @param lotteryData - 파싱된 복권 데이터
 * @param count - 추출할 개수
 * @returns 최근 N개 데이터
 */
export function getRecentData(lotteryData: LotteryData[], count: number = 10): LotteryData[] {
  return lotteryData.slice(0, count); // order가 높은 순으로 정렬되어 있으므로 앞에서부터
}

/**
 * 특정 범위의 데이터 추출
 * @param lotteryData - 파싱된 복권 데이터
 * @param startOrder - 시작 순서
 * @param endOrder - 끝 순서
 * @returns 범위 내 데이터
 */
export function getDataByRange(lotteryData: LotteryData[], startOrder: number, endOrder: number): LotteryData[] {
  return lotteryData.filter(data => data.order >= startOrder && data.order <= endOrder);
}

/**
 * PensionLottery.json 파일을 로드하고 파싱하여 분석 가능한 형태로 반환
 * @param url - JSON 파일의 URL (기본값: '/PensionLottery.json')
 * @returns 파싱된 데이터, 숫자 배열, 통계 정보
 */
export async function loadLotteryData(url: string = '/PensionLottery.json') {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const rawData = await response.json();
  const parsedData = parseLotteryData(rawData);
  const numbers = extractNumbers(parsedData);
  const statistics = getDataStatistics(parsedData);
  
  return {
    parsedData,
    numbers,
    statistics
  };
}

/**
 * 중복 숫자 패턴 분석
 * 각 회차의 6개 숫자를 6자리 문자열로 보고 내부 중복 패턴을 분석
 */
export interface DuplicatePatternAnalysisResult {
  // 중복 개수별 분류 (0개 중복, 1개 중복, 2개 중복, ...)
  duplicateCountDistribution: Record<number, number>;
  // 중복 개수별 비율
  duplicateCountRatio: Record<number, number>;
  // 1개만 중복된 경우, 어떤 숫자가 중복되었는지 카운트 (absenceCount: 연속 미출현 회차)
  singleDuplicateDigitRanking: Array<{ digit: string; count: number; absenceCount: number }>;
  // 전체 데이터 개수
  totalCount: number;
}

/**
 * 6자리 숫자 문자열 내에서 중복된 숫자 찾기
 * @param digitString - 6자리 숫자 문자열 (예: "094678")
 * @returns 중복된 숫자 배열 (예: [] 또는 ["9"] 또는 ["0", "9"])
 */
function findDuplicateDigits(digitString: string): string[] {
  const digitCount: Record<string, number> = {};
  const digits = digitString.split('');
  
  // 각 숫자별 카운트
  digits.forEach(digit => {
    digitCount[digit] = (digitCount[digit] || 0) + 1;
  });
  
  // 2번 이상 나타난 숫자만 반환
  return Object.entries(digitCount)
    .filter(([_, count]) => count >= 2)
    .map(([digit, _]) => digit);
}

/**
 * 6자리 숫자 문자열 내에서 최대 등장 횟수 확인
 * @param digitString - 6자리 숫자 문자열
 * @returns 최대 등장 횟수
 */
function getMaxDigitCount(digitString: string): number {
  const digitCount: Record<string, number> = {};
  const digits = digitString.split('');
  
  // 각 숫자별 카운트
  digits.forEach(digit => {
    digitCount[digit] = (digitCount[digit] || 0) + 1;
  });
  
  // 최대 등장 횟수 반환
  return Math.max(...Object.values(digitCount));
}

/**
 * 복권 데이터에서 중복 숫자 패턴 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 중복 패턴 분석 결과
 */
export function analyzeDuplicatePatterns(lotteryData: LotteryData[]): DuplicatePatternAnalysisResult {
  // 중복 개수별 분류
  const duplicateCountDistribution: Record<number, number> = {};
  // 1개만 중복된 경우의 숫자별 카운트
  const singleDuplicateDigitCount: Record<string, number> = {};
  
  lotteryData.forEach(data => {
    // 6자리 숫자 문자열로 변환 (앞에 0 패딩)
    const digitString = data.numbers.map(n => n.toString()).join('').padStart(6, '0');
    
    // 각 숫자별 등장 횟수 계산
    const digitCount: Record<string, number> = {};
    digitString.split('').forEach(digit => {
      digitCount[digit] = (digitCount[digit] || 0) + 1;
    });
    
    // 중복된 숫자 찾기 (2번 이상 나타난 숫자)
    const duplicates = findDuplicateDigits(digitString);
    const duplicateCount = duplicates.length;
    
    // 기타 패턴 판별
    // 조건 1: 중복된 숫자 종류가 3개 이상인 경우 (예: 112233)
    // 조건 2: 중복된 숫자 종류가 2개인데, 둘 다 3번 이상인 경우 (예: 111222, 101019)
    // 조건 3: 1개 중복인데 그 숫자가 3번 이상 나타나는 경우 (예: 222456)
    let isOthers = false;
    if (duplicateCount >= 3) {
      // 3개 이상 종류가 중복 → 기타
      isOthers = true;
    } else if (duplicateCount === 2) {
      // 2개 종류가 중복 → 둘 다 3번 이상인지 확인
      const bothThreeOrMore = duplicates.every(digit => digitCount[digit] >= 3);
      if (bothThreeOrMore) {
        isOthers = true;
      }
    } else if (duplicateCount === 1) {
      // 1개만 중복인 경우, 그 숫자가 정확히 2번만 나타나는지 확인
      const duplicateDigit = duplicates[0];
      if (digitCount[duplicateDigit] >= 3) {
        // 3번 이상 나타나면 기타로 분류 (예: 222456)
        isOthers = true;
      }
    }
    
    if (isOthers) {
      // 기타 패턴으로 분류
      duplicateCountDistribution[-1] = (duplicateCountDistribution[-1] || 0) + 1;
    } else {
      // 일반 중복 개수별 분류
      duplicateCountDistribution[duplicateCount] = (duplicateCountDistribution[duplicateCount] || 0) + 1;
      
      // 1개만 중복된 경우, 어떤 숫자가 중복되었는지 카운트 (정확히 2번만 나타나는 경우만)
      if (duplicateCount === 1) {
        const duplicateDigit = duplicates[0];
        // 이미 위에서 3번 이상인 경우는 걸러졌으므로, 여기서는 정확히 2번인 경우만
        if (digitCount[duplicateDigit] === 2) {
          singleDuplicateDigitCount[duplicateDigit] = (singleDuplicateDigitCount[duplicateDigit] || 0) + 1;
        }
      }
    }
  });
  
  // 중복 개수별 비율 계산
  const totalCount = lotteryData.length;
  const duplicateCountRatio: Record<number, number> = {};
  Object.keys(duplicateCountDistribution).forEach(key => {
    const count = parseInt(key);
    duplicateCountRatio[count] = duplicateCountDistribution[count] / totalCount;
  });

  // 연속 미출현: 최근 회차부터 역순으로, 해당 숫자가 2중복으로 나올 때까지의 회차 수
  const sortedNewestFirst = [...lotteryData].sort((a, b) => b.order - a.order);
  const getSingleDuplicateDigit = (data: LotteryData): string | null => {
    const digitString = data.numbers.map(n => n.toString()).join('').padStart(6, '0');
    const digitCount: Record<string, number> = {};
    digitString.split('').forEach(d => { digitCount[d] = (digitCount[d] || 0) + 1; });
    const duplicates = findDuplicateDigits(digitString);
    if (duplicates.length !== 1) return null;
    const d = duplicates[0];
    if (digitCount[d] !== 2) return null;
    return d;
  };
  const absenceByDigit: Record<string, number> = {};
  for (const digit of Object.keys(singleDuplicateDigitCount)) {
    let count = 0;
    for (const data of sortedNewestFirst) {
      if (getSingleDuplicateDigit(data) === digit) break;
      count++;
    }
    absenceByDigit[digit] = count;
  }

  // 1개 중복 숫자별 순위 매기기 (빈도순 정렬)
  const singleDuplicateDigitRanking = Object.entries(singleDuplicateDigitCount)
    .map(([digit, count]) => ({
      digit,
      count,
      absenceCount: absenceByDigit[digit] ?? sortedNewestFirst.length
    }))
    .sort((a, b) => b.count - a.count);

  return {
    duplicateCountDistribution,
    duplicateCountRatio,
    singleDuplicateDigitRanking,
    totalCount
  };
}

/**
 * 같은 숫자가 중복된 횟수별 분석 결과
 */
export interface DuplicateFrequencyAnalysis {
  // 0개(중복없음), 2개 나온 횟수, 3개 나온 횟수, ..., 6개 나온 횟수
  frequencyDistribution: Record<number, number>; // 0, 2, 3, 4, 5, 6
  // 각 빈도별 비율
  frequencyRatio: Record<number, number>;
  // 전체 회차 수
  totalCount: number;
}

/**
 * 같은 숫자가 중복된 횟수별 분석
 * 각 회차에서 같은 숫자가 몇 번 나타나는지 분석 (0개=중복없음, 2개, 3개, 4개, 5개, 6개)
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 중복 빈도별 분석 결과
 */
export function analyzeDuplicateFrequency(lotteryData: LotteryData[]): DuplicateFrequencyAnalysis {
  const frequencyDistribution: Record<number, number> = {
    0: 0, // 중복 없음
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };
  
  lotteryData.forEach(data => {
    // 6자리 숫자 문자열로 변환
    const digitString = data.numbers.map(n => n.toString()).join('').padStart(6, '0');
    const digits = digitString.split('');
    
    // 각 숫자별 등장 횟수 계산
    const digitCount: Record<string, number> = {};
    digits.forEach(digit => {
      digitCount[digit] = (digitCount[digit] || 0) + 1;
    });
    
    // 최대 중복 횟수 찾기
    const maxFrequency = Math.max(...Object.values(digitCount));
    
    if (maxFrequency === 1) {
      // 중복 없음 (모든 숫자가 다른 경우)
      frequencyDistribution[0] = (frequencyDistribution[0] || 0) + 1;
    } else if (maxFrequency >= 2 && maxFrequency <= 6) {
      frequencyDistribution[maxFrequency] = (frequencyDistribution[maxFrequency] || 0) + 1;
    }
  });
  
  // 각 빈도별 비율 계산
  const totalCount = lotteryData.length;
  const frequencyRatio: Record<number, number> = {};
  Object.keys(frequencyDistribution).forEach(key => {
    const freq = parseInt(key);
    frequencyRatio[freq] = frequencyDistribution[freq] / totalCount;
  });
  
  return {
    frequencyDistribution,
    frequencyRatio,
    totalCount
  };
}

/**
 * 중복 숫자 배치 패턴 분석 결과 (1개 중복인 경우)
 */
export interface DuplicatePositionPatternAnalysis {
  // 패턴별 분포 (예: "OXOXXX": 10회)
  patternDistribution: Record<string, number>;
  // 패턴별 비율
  patternRatio: Record<string, number>;
  // 패턴별 상세 정보
  patternDetails: Array<{
    pattern: string;
    count: number;
    percentage: number;
    examples: number[]; // 예시 회차 (최대 5개)
    absenceCount: number; // 연속 미출현: 최근 회차부터 세어 해당 패턴이 나올 때까지의 회차 수
  }>;
  totalCount: number;
}

/**
 * 1개 중복 숫자의 배치 패턴 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 중복 숫자 배치 패턴 분석 결과
 */
export function analyzeDuplicatePositionPatterns(lotteryData: LotteryData[]): DuplicatePositionPatternAnalysis {
  const patternDistribution: Record<string, number> = {};
  const patternExamples: Record<string, number[]> = {};
  
  lotteryData.forEach(data => {
    // 6자리 숫자 문자열로 변환
    const digitString = data.numbers.map(n => n.toString()).join('').padStart(6, '0');
    const digits = digitString.split('');
    
    // 각 숫자별 등장 횟수 계산
    const digitCount: Record<string, number> = {};
    digits.forEach(digit => {
      digitCount[digit] = (digitCount[digit] || 0) + 1;
    });
    
    // 중복된 숫자 찾기 (2번 이상 나타난 숫자)
    const duplicates = findDuplicateDigits(digitString);
    
    // 1개만 중복이고, 그 숫자가 정확히 2번만 나타나는 경우에만 분석
    if (duplicates.length === 1) {
      const duplicateDigit = duplicates[0];
      const duplicateCount = digitCount[duplicateDigit];
      
      // 같은 숫자가 정확히 2번만 나타나는 경우만 분석 (3개 이상 제외)
      if (duplicateCount === 2) {
        // 배치 패턴 생성 (O: 중복 숫자 위치, X: 다른 숫자 위치)
        const pattern = digits.map(d => d === duplicateDigit ? 'O' : 'X').join('');
        
        // 패턴별 카운트
        patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;
        
        // 패턴별 예시 저장 (최대 5개)
        if (!patternExamples[pattern]) {
          patternExamples[pattern] = [];
        }
        if (patternExamples[pattern].length < 5) {
          patternExamples[pattern].push(data.order);
        }
      }
    }
  });
  
  // 패턴별 비율 계산
  const totalCount = Object.values(patternDistribution).reduce((sum, count) => sum + count, 0);
  const patternRatio: Record<string, number> = {};
  Object.keys(patternDistribution).forEach(pattern => {
    patternRatio[pattern] = patternDistribution[pattern] / totalCount;
  });
  
  // 연속 미출현: 최근 회차부터 역순으로 세어, 해당 패턴이 나올 때까지의 회차 수
  const sortedNewestFirst = [...lotteryData].sort((a, b) => b.order - a.order);
  const getPatternOfRound = (data: LotteryData): string | null => {
    const digitString = data.numbers.map(n => n.toString()).join('').padStart(6, '0');
    const digits = digitString.split('');
    const digitCount: Record<string, number> = {};
    digits.forEach(d => { digitCount[d] = (digitCount[d] || 0) + 1; });
    const duplicates = findDuplicateDigits(digitString);
    if (duplicates.length !== 1) return null;
    const duplicateDigit = duplicates[0];
    if (digitCount[duplicateDigit] !== 2) return null;
    return digits.map(d => d === duplicateDigit ? 'O' : 'X').join('');
  };
  const absenceCountByPattern: Record<string, number> = {};
  for (const pattern of Object.keys(patternDistribution)) {
    let count = 0;
    for (const data of sortedNewestFirst) {
      const roundPattern = getPatternOfRound(data);
      if (roundPattern === pattern) break;
      count++;
    }
    absenceCountByPattern[pattern] = count;
  }

  // 패턴별 상세 정보 생성 (빈도순 정렬)
  const patternDetails = Object.entries(patternDistribution)
    .map(([pattern, count]) => ({
      pattern,
      count,
      percentage: patternRatio[pattern] * 100,
      examples: patternExamples[pattern] || [],
      absenceCount: absenceCountByPattern[pattern] ?? sortedNewestFirst.length
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    patternDistribution,
    patternRatio,
    patternDetails,
    totalCount
  };
}

/**
 * 각 자리별 숫자 빈도 분석 결과
 */
export interface PositionFrequencyAnalysis {
  position: number; // 1~6번째 자리
  digitFrequency: Record<number, number>; // 각 숫자(0~9)의 빈도
  highestFrequency: {
    digit: number;
    count: number;
    percentage: number;
  };
  lowestFrequency: {
    digit: number;
    count: number;
    percentage: number;
  };
}

/**
 * 각 자리별 숫자 빈도 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 각 자리별 빈도 분석 결과 (6개 자리)
 */
export function analyzePositionFrequency(lotteryData: LotteryData[]): PositionFrequencyAnalysis[] {
  const totalCount = lotteryData.length;
  const positionFrequencies: PositionFrequencyAnalysis[] = [];
  
  // 각 자리(1~6)별로 분석
  for (let position = 0; position < 6; position++) {
    const digitFrequency: Record<number, number> = {};
    
    // 해당 자리의 모든 숫자 카운트
    lotteryData.forEach(data => {
      // numbers 배열의 position번째 인덱스 (0~5)
      const digit = data.numbers[position];
      digitFrequency[digit] = (digitFrequency[digit] || 0) + 1;
    });
    
    // 가장 높은 빈도와 낮은 빈도 찾기
    let maxCount = 0;
    let minCount = Infinity;
    let maxDigit = 0;
    let minDigit = 0;
    
    for (let digit = 0; digit <= 9; digit++) {
      const count = digitFrequency[digit] || 0;
      if (count > maxCount) {
        maxCount = count;
        maxDigit = digit;
      }
      if (count < minCount) {
        minCount = count;
        minDigit = digit;
      }
    }
    
    positionFrequencies.push({
      position: position + 1, // 1~6
      digitFrequency,
      highestFrequency: {
        digit: maxDigit,
        count: maxCount,
        percentage: (maxCount / totalCount) * 100
      },
      lowestFrequency: {
        digit: minDigit,
        count: minCount,
        percentage: (minCount / totalCount) * 100
      }
    });
  }
  
  return positionFrequencies;
}

/**
 * 자릿수 합계 분포 분석 결과
 */
export interface DigitSumAnalysis {
  // 각 합계값별 개수
  sumDistribution: Record<number, number>;
  // 합계별 비율
  sumRatio: Record<number, number>;
  // 통계 정보
  statistics: {
    minSum: number;
    maxSum: number;
    avgSum: number;
    modeSum: number; // 최빈값
    medianSum: number;
  };
  // 전체 데이터 개수
  totalCount: number;
}

/**
 * 자릿수 합계 분포 분석
 * 각 복권 번호의 6자리 숫자를 모두 더한 합계의 분포를 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 자릿수 합계 분포 분석 결과
 */
export function analyzeDigitSum(lotteryData: LotteryData[]): DigitSumAnalysis {
  const totalCount = lotteryData.length;
  const sumDistribution: Record<number, number> = {};
  const sums: number[] = [];
  
  // 각 복권 번호의 자릿수 합계 계산
  lotteryData.forEach(data => {
    const digitSum = data.numbers.reduce((sum, digit) => sum + digit, 0);
    sums.push(digitSum);
    sumDistribution[digitSum] = (sumDistribution[digitSum] || 0) + 1;
  });
  
  // 통계 계산
  const sortedSums = [...sums].sort((a, b) => a - b);
  const minSum = Math.min(...sums);
  const maxSum = Math.max(...sums);
  const avgSum = sums.reduce((sum, val) => sum + val, 0) / totalCount;
  const medianSum = totalCount % 2 === 0
    ? (sortedSums[totalCount / 2 - 1] + sortedSums[totalCount / 2]) / 2
    : sortedSums[Math.floor(totalCount / 2)];
  
  // 최빈값 계산
  let modeSum = minSum;
  let maxCount = 0;
  Object.entries(sumDistribution).forEach(([sum, count]) => {
    if (count > maxCount) {
      maxCount = count;
      modeSum = parseInt(sum);
    }
  });
  
  // 합계별 비율 계산
  const sumRatio: Record<number, number> = {};
  Object.keys(sumDistribution).forEach(key => {
    const sum = parseInt(key);
    sumRatio[sum] = sumDistribution[sum] / totalCount;
  });
  
  return {
    sumDistribution,
    sumRatio,
    statistics: {
      minSum,
      maxSum,
      avgSum,
      modeSum,
      medianSum
    },
    totalCount
  };
}

/**
 * 직전 회차 대비 변화 분석 결과
 */
export interface PreviousRoundComparisonAnalysis {
  // 증가/감소/동일 개수
  increaseCount: number; // 직전보다 큰 경우
  decreaseCount: number; // 직전보다 작은 경우
  sameCount: number; // 직전과 같은 경우
  // 비율
  increaseRatio: number;
  decreaseRatio: number;
  sameRatio: number;
  // 연속 패턴
  maxConsecutiveIncrease: number; // 최대 연속 증가
  maxConsecutiveDecrease: number; // 최대 연속 감소
  // 변화량 통계
  changeStatistics: {
    avgIncrease: number; // 평균 증가량
    avgDecrease: number; // 평균 감소량
    avgTotalChange: number; // 총 평균 변화량 (상승과 하락 모두 포함한 전체 평균)
    stdDeviation: number; // 표준편차
    maxIncrease: number; // 최대 증가량
    maxDecrease: number; // 최대 감소량
    minChange: number; // 최소 변화량 (가장 작은 차이)
    maxChange: number; // 최대 변화량 (가장 큰 차이)
  };
  // 표준편차 범위 분석
  standardDeviationAnalysis: {
    withinRangeCount: number; // 평균 ± 표준편차 범위 내
    outOfRangeCount: number; // 평균 ± 표준편차 범위 밖
    withinRangeRatio: number; // 범위 내 비율
    outOfRangeRatio: number; // 범위 밖 비율
  };
  totalComparisons: number; // 비교 가능한 회차 수 (첫 회차 제외)
}

/**
 * 직전 회차 대비 변화 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 직전 회차 대비 변화 분석 결과
 */
export function analyzePreviousRoundComparison(lotteryData: LotteryData[]): PreviousRoundComparisonAnalysis {
  if (lotteryData.length < 2) {
    return {
      increaseCount: 0,
      decreaseCount: 0,
      sameCount: 0,
      increaseRatio: 0,
      decreaseRatio: 0,
      sameRatio: 0,
      maxConsecutiveIncrease: 0,
      maxConsecutiveDecrease: 0,
      changeStatistics: {
        avgIncrease: 0,
        avgDecrease: 0,
        avgTotalChange: 0,
        stdDeviation: 0,
        maxIncrease: 0,
        maxDecrease: 0,
        minChange: 0,
        maxChange: 0
      },
      standardDeviationAnalysis: {
        withinRangeCount: 0,
        outOfRangeCount: 0,
        withinRangeRatio: 0,
        outOfRangeRatio: 0
      },
      totalComparisons: 0
    };
  }

  // 회차 순서대로 정렬 (1회차부터)
  const sortedData = [...lotteryData].sort((a, b) => a.order - b.order);
  
  let increaseCount = 0;
  let decreaseCount = 0;
  let sameCount = 0;
  const increases: number[] = [];
  const decreases: number[] = [];
  const allChanges: number[] = []; // 모든 변화량 (상승, 하락, 동일 포함)
  
  let currentIncreaseStreak = 0;
  let currentDecreaseStreak = 0;
  let maxConsecutiveIncrease = 0;
  let maxConsecutiveDecrease = 0;
  
  for (let i = 1; i < sortedData.length; i++) {
    const currentNumber = sortedData[i].combinedNumber;
    const previousNumber = sortedData[i - 1].combinedNumber;
    const change = currentNumber - previousNumber;
    
    // 모든 변화량 저장
    allChanges.push(change);
    
    if (change > 0) {
      increaseCount++;
      increases.push(change);
      currentIncreaseStreak++;
      currentDecreaseStreak = 0;
      maxConsecutiveIncrease = Math.max(maxConsecutiveIncrease, currentIncreaseStreak);
    } else if (change < 0) {
      decreaseCount++;
      decreases.push(Math.abs(change));
      currentDecreaseStreak++;
      currentIncreaseStreak = 0;
      maxConsecutiveDecrease = Math.max(maxConsecutiveDecrease, currentDecreaseStreak);
    } else {
      sameCount++;
      currentIncreaseStreak = 0;
      currentDecreaseStreak = 0;
    }
  }
  
  const totalComparisons = sortedData.length - 1;
  const increaseRatio = totalComparisons > 0 ? increaseCount / totalComparisons : 0;
  const decreaseRatio = totalComparisons > 0 ? decreaseCount / totalComparisons : 0;
  const sameRatio = totalComparisons > 0 ? sameCount / totalComparisons : 0;
  
  // 변화량 통계
  const avgIncrease = increases.length > 0 
    ? increases.reduce((sum, val) => sum + val, 0) / increases.length 
    : 0;
  const avgDecrease = decreases.length > 0
    ? decreases.reduce((sum, val) => sum + val, 0) / decreases.length
    : 0;
  // 총 평균: 상승 평균과 하락 평균의 절댓값 평균
  const avgTotalChange = (increases.length > 0 || decreases.length > 0)
    ? (Math.abs(avgIncrease) + Math.abs(avgDecrease)) / 2
    : 0;
  
  // 전체 변화량의 평균 (양수, 음수 포함한 실제 평균)
  const avgAllChange = allChanges.length > 0
    ? allChanges.reduce((sum, val) => sum + val, 0) / allChanges.length
    : 0;
  
  // 표준편차 계산
  const variance = allChanges.length > 1
    ? allChanges.reduce((sum, val) => sum + Math.pow(val - avgAllChange, 2), 0) / (allChanges.length - 1)
    : 0;
  const stdDeviation = Math.sqrt(variance);
  
  // 평균 ± 표준편차 범위 내/외 분석
  const lowerBound = avgAllChange - stdDeviation;
  const upperBound = avgAllChange + stdDeviation;
  let withinRangeCount = 0;
  let outOfRangeCount = 0;
  
  allChanges.forEach(change => {
    if (change >= lowerBound && change <= upperBound) {
      withinRangeCount++;
    } else {
      outOfRangeCount++;
    }
  });
  
  const withinRangeRatio = allChanges.length > 0 ? withinRangeCount / allChanges.length : 0;
  const outOfRangeRatio = allChanges.length > 0 ? outOfRangeCount / allChanges.length : 0;
  
  const maxIncrease = increases.length > 0 ? Math.max(...increases) : 0;
  const maxDecrease = decreases.length > 0 ? Math.max(...decreases) : 0;
  const minChange = allChanges.length > 0 ? Math.min(...allChanges) : 0;
  const maxChange = allChanges.length > 0 ? Math.max(...allChanges) : 0;
  
  return {
    increaseCount,
    decreaseCount,
    sameCount,
    increaseRatio,
    decreaseRatio,
    sameRatio,
    maxConsecutiveIncrease,
    maxConsecutiveDecrease,
    changeStatistics: {
      avgIncrease,
      avgDecrease,
      avgTotalChange,
      stdDeviation,
      maxIncrease,
      maxDecrease,
      minChange,
      maxChange
    },
    standardDeviationAnalysis: {
      withinRangeCount,
      outOfRangeCount,
      withinRangeRatio,
      outOfRangeRatio
    },
    totalComparisons
  };
}

/**
 * 맨 앞자리(첫 자리) 직전 회차 대비 클/작음 비교 결과
 */
export interface FirstDigitComparisonResult {
  increaseCount: number;
  decreaseCount: number;
  sameCount: number;
  increaseRatio: number;
  decreaseRatio: number;
  sameRatio: number;
  totalComparisons: number;
}

/**
 * 맨 앞자리 숫자만 직전 회차와 비교 (다음 회차 첫 자리가 직전보다 클/작을 비율)
 * @param lotteryData - 파싱된 복권 데이터
 */
export function analyzeFirstDigitComparison(lotteryData: LotteryData[]): FirstDigitComparisonResult {
  if (lotteryData.length < 2) {
    return {
      increaseCount: 0,
      decreaseCount: 0,
      sameCount: 0,
      increaseRatio: 0,
      decreaseRatio: 0,
      sameRatio: 0,
      totalComparisons: 0
    };
  }
  const sortedData = [...lotteryData].sort((a, b) => a.order - b.order);
  let increaseCount = 0;
  let decreaseCount = 0;
  let sameCount = 0;
  for (let i = 1; i < sortedData.length; i++) {
    const currFirst = sortedData[i].numbers[0];
    const prevFirst = sortedData[i - 1].numbers[0];
    if (currFirst > prevFirst) increaseCount++;
    else if (currFirst < prevFirst) decreaseCount++;
    else sameCount++;
  }
  const total = sortedData.length - 1;
  return {
    increaseCount,
    decreaseCount,
    sameCount,
    increaseRatio: total > 0 ? increaseCount / total : 0,
    decreaseRatio: total > 0 ? decreaseCount / total : 0,
    sameRatio: total > 0 ? sameCount / total : 0,
    totalComparisons: total
  };
}

/**
 * 연속 숫자 패턴 분석 결과
 */
export interface ConsecutivePatternAnalysis {
  // 인접 자리 간 차이 패턴
  differenceDistribution: Record<number, number>; // 차이값별 분포 (-9 ~ 9)
  // 연속 증가 패턴 (차이가 1인 경우)
  consecutiveIncreaseCount: number;
  // 연속 감소 패턴 (차이가 -1인 경우)
  consecutiveDecreaseCount: number;
  // 동일 숫자 패턴 (차이가 0인 경우)
  sameDigitCount: number;
  // 큰 점프 패턴 (차이가 5 이상)
  largeJumpCount: number;
  // 전체 회차 수
  totalCount: number;
}

/**
 * 연속 숫자 패턴 분석
 * 인접한 자리 간 숫자 차이를 분석하여 패턴을 찾음
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 연속 숫자 패턴 분석 결과
 */
export function analyzeConsecutivePatterns(lotteryData: LotteryData[]): ConsecutivePatternAnalysis {
  const differenceDistribution: Record<number, number> = {};
  let consecutiveIncreaseCount = 0;
  let consecutiveDecreaseCount = 0;
  let sameDigitCount = 0;
  let largeJumpCount = 0;
  
  lotteryData.forEach(data => {
    const numbers = data.numbers;
    
    // 인접한 자리 간 차이 계산
    for (let i = 0; i < numbers.length - 1; i++) {
      const diff = numbers[i + 1] - numbers[i];
      differenceDistribution[diff] = (differenceDistribution[diff] || 0) + 1;
      
      if (diff === 1) {
        consecutiveIncreaseCount++;
      } else if (diff === -1) {
        consecutiveDecreaseCount++;
      } else if (diff === 0) {
        sameDigitCount++;
      } else if (Math.abs(diff) >= 5) {
        largeJumpCount++;
      }
    }
  });
  
  return {
    differenceDistribution,
    consecutiveIncreaseCount,
    consecutiveDecreaseCount,
    sameDigitCount,
    largeJumpCount,
    totalCount: lotteryData.length * 5 // 5개의 인접 쌍이 있음
  };
}

/**
 * 숫자 범위 분포 분석 결과
 */
export interface RangeDistributionAnalysis {
  // 범위별 분포 (0-3: 낮은 숫자, 4-6: 중간 숫자, 7-9: 높은 숫자)
  rangeDistribution: {
    low: number;    // 0-3
    medium: number; // 4-6
    high: number;   // 7-9
  };
  // 범위별 비율
  rangeRatio: {
    low: number;
    medium: number;
    high: number;
  };
  // 전체 회차 수
  totalCount: number;
}

/**
 * 숫자 범위 분포 분석
 * 각 자리의 숫자를 범위별로 분류하여 분포를 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 범위 분포 분석 결과
 */
export function analyzeRangeDistribution(lotteryData: LotteryData[]): RangeDistributionAnalysis {
  let lowCount = 0;    // 0-3
  let mediumCount = 0; // 4-6
  let highCount = 0;   // 7-9
  
  lotteryData.forEach(data => {
    data.numbers.forEach(num => {
      if (num >= 0 && num <= 3) {
        lowCount++;
      } else if (num >= 4 && num <= 6) {
        mediumCount++;
      } else if (num >= 7 && num <= 9) {
        highCount++;
      }
    });
  });
  
  const totalDigits = lotteryData.length * 6;
  const lowRatio = lowCount / totalDigits;
  const mediumRatio = mediumCount / totalDigits;
  const highRatio = highCount / totalDigits;
  
  return {
    rangeDistribution: {
      low: lowCount,
      medium: mediumCount,
      high: highCount
    },
    rangeRatio: {
      low: lowRatio,
      medium: mediumRatio,
      high: highRatio
    },
    totalCount: lotteryData.length
  };
}

/**
 * 짝수/홀수 분포 분석 결과
 */
export interface EvenOddPatternAnalysis {
  // 짝수/홀수 분포
  evenOddDistribution: {
    even: number; // 짝수 개수
    odd: number;  // 홀수 개수
  };
  // 각 회차별 짝수 개수 분포 (0~6개)
  evenCountDistribution: Record<number, number>;
  // 전체 회차 수
  totalCount: number;
}

/**
 * 짝수/홀수 분포 분석
 * 각 회차의 짝수/홀수 분포를 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 짝수/홀수 분포 분석 결과
 */
export function analyzeEvenOddPatterns(lotteryData: LotteryData[]): EvenOddPatternAnalysis {
  const evenOddDistribution = {
    even: 0,
    odd: 0
  };
  const evenCountDistribution: Record<number, number> = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  };
  
  lotteryData.forEach(data => {
    let evenCount = 0;
    
    data.numbers.forEach(num => {
      if (num % 2 === 0) {
        evenOddDistribution.even++;
        evenCount++;
      } else {
        evenOddDistribution.odd++;
      }
    });
    
    evenCountDistribution[evenCount] = (evenCountDistribution[evenCount] || 0) + 1;
  });
  
  return {
    evenOddDistribution,
    evenCountDistribution,
    totalCount: lotteryData.length
  };
}

/**
 * 숫자 쌍 패턴 분석 결과
 */
export interface DigitPairPatternAnalysis {
  // 특정 숫자 쌍의 출현 빈도 (예: "01": 10회, "23": 5회)
  pairFrequency: Record<string, number>;
  // 가장 자주 나타나는 숫자 쌍 상위 10개
  topPairs: Array<{ pair: string; count: number; percentage: number }>;
  // 전체 회차 수
  totalCount: number;
}

/**
 * 숫자 쌍 패턴 분석
 * 인접한 두 자리의 숫자 쌍이 얼마나 자주 나타나는지 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 숫자 쌍 패턴 분석 결과
 */
export function analyzeDigitPairPatterns(lotteryData: LotteryData[]): DigitPairPatternAnalysis {
  const pairFrequency: Record<string, number> = {};
  
  lotteryData.forEach(data => {
    const numbers = data.numbers;
    
    // 인접한 숫자 쌍 생성
    for (let i = 0; i < numbers.length - 1; i++) {
      const pair = `${numbers[i]}${numbers[i + 1]}`;
      pairFrequency[pair] = (pairFrequency[pair] || 0) + 1;
    }
  });
  
  // 상위 10개 쌍 추출
  const totalPairs = lotteryData.length * 5; // 5개의 쌍이 있음
  const topPairs = Object.entries(pairFrequency)
    .map(([pair, count]) => ({
      pair,
      count,
      percentage: (count / totalPairs) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    pairFrequency,
    topPairs,
    totalCount: lotteryData.length
  };
}

/**
 * 각 자리별 전이 패턴 분석 결과
 * 각 자리에서 이전 회차의 숫자가 X였을 때, 다음 회차의 같은 자리에 나온 숫자 Y의 빈도
 */
export interface PositionTransitionAnalysis {
  // 각 자리(1~6)별 전이 패턴
  positionTransitions: Array<{
    position: number; // 1~6번째 자리
    // 이전 숫자 X -> 다음 숫자 Y의 빈도
    transitions: Record<string, Record<number, number>>; // "X" -> { Y: count }
    // 각 이전 숫자별로 다음 숫자들의 빈도 합계
    transitionTotals: Record<string, number>; // "X" -> total count
    // 각 이전 숫자별로 다음 숫자들의 확률 분포
    transitionProbabilities: Record<string, Record<number, number>>; // "X" -> { Y: probability }
  }>;
  totalTransitions: number; // 전체 전이 개수 (회차 수 - 1)
}

/**
 * 각 자리별 전이 패턴 분석
 * 각 자리에서 이전 회차의 숫자가 나왔을 때, 다음 회차의 같은 자리에 어떤 숫자가 나오는지 분석
 * @param lotteryData - 파싱된 복권 데이터
 * @returns 각 자리별 전이 패턴 분석 결과
 */
export function analyzePositionTransition(lotteryData: LotteryData[]): PositionTransitionAnalysis {
  if (lotteryData.length < 2) {
    return {
      positionTransitions: [],
      totalTransitions: 0
    };
  }

  // 회차 순서대로 정렬
  const sortedData = [...lotteryData].sort((a, b) => a.order - b.order);
  
  // 각 자리(0~5, 즉 1~6번째)별 전이 패턴 저장
  const positionTransitions: Array<{
    position: number;
    transitions: Record<string, Record<number, number>>;
    transitionTotals: Record<string, number>;
    transitionProbabilities: Record<string, Record<number, number>>;
  }> = [];

  // 각 자리별로 분석
  for (let pos = 0; pos < 6; pos++) {
    const transitions: Record<string, Record<number, number>> = {}; // "X" -> { Y: count }
    const transitionTotals: Record<string, number> = {}; // "X" -> total count

    // 각 회차 쌍을 순회하며 전이 패턴 기록
    for (let i = 1; i < sortedData.length; i++) {
      const prevDigit = sortedData[i - 1].numbers[pos]; // 이전 회차의 해당 자리 숫자
      const nextDigit = sortedData[i].numbers[pos]; // 다음 회차의 해당 자리 숫자

      // 이전 숫자 X에 대한 전이 맵 초기화
      if (!transitions[prevDigit]) {
        transitions[prevDigit] = {};
      }
      if (!transitionTotals[prevDigit]) {
        transitionTotals[prevDigit] = 0;
      }

      // 다음 숫자 Y의 빈도 증가
      transitions[prevDigit][nextDigit] = (transitions[prevDigit][nextDigit] || 0) + 1;
      transitionTotals[prevDigit]++;
    }

    // 각 이전 숫자별로 다음 숫자들의 확률 계산
    const transitionProbabilities: Record<string, Record<number, number>> = {};
    for (const prevDigit in transitions) {
      transitionProbabilities[prevDigit] = {};
      const total = transitionTotals[prevDigit];
      
      for (const nextDigit in transitions[prevDigit]) {
        const count = transitions[prevDigit][nextDigit];
        transitionProbabilities[prevDigit][parseInt(nextDigit)] = total > 0 ? count / total : 0;
      }
    }

    positionTransitions.push({
      position: pos + 1, // 1~6
      transitions,
      transitionTotals,
      transitionProbabilities
    });
  }

  return {
    positionTransitions,
    totalTransitions: sortedData.length - 1
  };
}
