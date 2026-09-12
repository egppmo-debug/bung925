import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs in browser
try {
  // Use unpkg/cdnjs CDN matching installed version, with graceful fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('Could not set pdfjs workerSrc:', e);
}

export interface ExtractedCretopData {
  companyName?: string;
  bizNumber?: string;
  ceoName?: string;
  valuationDate?: string;
  totalShares?: number;
  faceValue?: number;
  capitalStock?: number;
  years?: { n1: number; n2: number; n3: number };
  profitYear1?: number; // n-1
  profitYear2?: number; // n-2
  profitYear3?: number; // n-3
  totalAssets?: number;
  totalLiabilities?: number;
  confidenceNotes: string[];
}

/**
 * Clean numeric string into an integer or float
 */
function parseCleanNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract all text page-by-page from an uploaded PDF file
 */
export async function extractTextFromPdf(file: File): Promise<{ fullText: string; pages: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str || '')
      .join(' ');
    pages.push(pageText);
  }

  return {
    fullText: pages.join('\n\n--- PAGE BREAK ---\n\n'),
    pages,
  };
}

const BANNED_COMPANY_TERMS = new Set([
  '구분',
  '직위',
  '매출액',
  '결산월',
  '사업자번호',
  '대표자명',
  '대표자',
  '출원인',
  '최종권리자',
  '발명의명칭',
  '주주명',
  '소유주식주',
  '지분율',
  '기업명',
  '영문기업명',
  '단위',
  '백만원',
  '천원',
  '원',
  '순번',
  '순위',
  '내용',
  '연혁일자',
  '업종',
  '주소',
  '설립일자',
  '법인번호',
  '종업원수',
  'GusangKSC',
  '동사',
  '미확인',
  '보고서',
  '정보',
  'KODATA',
  'CRETOP',
  '한국평가데이터',
]);

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/[\u2022\u00B7\uFF65\u25AA\u25CF]/g, ' ')
    .replace(/\(\s*주\s*\)/g, '(주)')
    .replace(/\(\s*유\s*\)/g, '(유)')
    .replace(/\(\s*합\s*\)/g, '(합)')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function isValidCompanyName(name: string | undefined): boolean {
  if (!name) return false;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 35) return false;

  if (BANNED_COMPANY_TERMS.has(clean)) return false;

  const wordChars = clean.replace(/[^가-힣a-zA-Z0-9]/g, '');
  if (wordChars.length < 2) return false;

  // Reject strings matching common table headers
  if (/^(구분|직위|매출액|결산월|순번|순위|현직|사내이사|감사|대표이사|사내|비상근)/.test(clean)) return false;
  if (/(구분|직위|매출액|결산월)$/.test(clean) && !clean.includes('(주)')) return false;

  return true;
}

function cleanCandidate(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[-*•\s]*(?:사업자번호|대표자명|대표자|영문기업명|법인번호|종업원|KODATA|한국평가데이터)[\s\S]*$/, '');
  s = s.replace(/^[-:•\s·]+/, '').replace(/[-:•\s·]+$/, '');
  s = s.replace(/\(\s*주\s*\)/g, '(주)');
  s = s.replace(/^[(\[]\s*주\s*[)\]]/, '(주)');
  return s.trim();
}

/**
 * Parse CRETOP (KODATA) corporate report text into structured valuation inputs
 */
export function parseCretopReport(rawPages: string[], filename?: string): ExtractedCretopData {
  const pages = rawPages.map(normalizeText);
  const fullText = pages.join('\n');
  const result: ExtractedCretopData = {
    confidenceNotes: [],
  };

  // 1. Business Number & CEO Name
  const bizMatch = fullText.match(/(?:사업자번호|사업자등록번호)\s*[:：]?\s*(\d{3}-\d{2}-\d{5})/);
  if (bizMatch) {
    result.bizNumber = bizMatch[1].trim();
  }
  const ceoMatch =
    fullText.match(/(?:대표자명|대표자)\s*[:：]?\s*([가-힣a-zA-Z]{2,10})/) ||
    fullText.match(/대표이사\s*[:：]?\s*([가-힣a-zA-Z]{2,10})/);
  if (ceoMatch && !['사내이사', '단독이사', '본인'].includes(ceoMatch[1])) {
    result.ceoName = ceoMatch[1].trim();
  }

  // 2. 기업명 (Company Name) - Multi-layered priority extraction
  let detectedName: string | undefined;

  // Priority 1: Page 1 cover page ("- 기업명 : (주)동산기획" or "기업명 : (주)동산기획")
  if (pages[0]) {
    const p1 = pages[0];
    const m1 =
      p1.match(/(?:[-*•\s]|^)(?:기\s*업\s*명|상\s*호)\s*[:：]\s*([^\n\r-]+)/) ||
      p1.match(/(?:[-*•\s]|^)(?:기\s*업\s*명|상\s*호)\s*[:：]?\s*((?:\((?:주|유|합)\)|㈜)?\s*[가-힣A-Za-z0-9]+(?:\s+[가-힣A-Za-z0-9]+)*?)(?=\s*[-*•]|\s+사업자번호|\s+대표자|\s*$)/);
    if (m1 && m1[1]) {
      const cand = cleanCandidate(m1[1]);
      if (isValidCompanyName(cand)) {
        detectedName = cand;
      }
    }
  }

  // Priority 2: Page 6 Profile Table ("기업명 (주)동산기획 영문기업명 DONGSAN CO., LTD.")
  if (!detectedName) {
    for (const p of pages) {
      const profMatch = p.match(/(?:기\s*업\s*명)\s+([^\n\r]+?)\s+(?:영\s*문\s*기\s*업\s*명)/);
      if (profMatch && profMatch[1]) {
        const cand = cleanCandidate(profMatch[1]);
        if (isValidCompanyName(cand)) {
          detectedName = cand;
          break;
        }
      }
    }
  }

  // Priority 3: Overview / Summary on Page 13 ("기업체개요 (주)동산기획(이하'동사')")
  if (!detectedName) {
    const overMatch = fullText.match(
      /(?:기업체개요|종합의견|개요)[\s\S]*?((?:\((?:주|유|합)\)|㈜)?\s*[가-힣A-Za-z0-9]+(?:\s+[가-힣A-Za-z0-9]+)*?)\s*\(\s*이하\s*['"‘]?동사['"’]?\s*\)/
    );
    if (overMatch && overMatch[1]) {
      const cand = cleanCandidate(overMatch[1]);
      if (isValidCompanyName(cand)) {
        detectedName = cand;
      }
    }
  }

  // Priority 4: History establishment ("...소재에서(주)동산기획설립")
  if (!detectedName) {
    const histMatch =
      fullText.match(/(?:소재에서|목적으로)\s*((?:\((?:주|유|합)\)|㈜)?\s*[가-힣A-Za-z0-9]+(?:\s+[가-힣A-Za-z0-9]+)*?)\s*(?:설립|창립|개업)/) ||
      fullText.match(/상호를\s*\(?([^()\s]+)\)?로\s*변경/);
    if (histMatch && histMatch[1]) {
      const cand = cleanCandidate(histMatch[1]);
      if (isValidCompanyName(cand)) {
        detectedName = cand;
      }
    }
  }

  // Priority 5: Benchmark table row matched by business number (Page 16)
  if (!detectedName && result.bizNumber) {
    const escapedBiz = result.bizNumber.replace(/-/g, '[- ]?');
    const bizRowRegex = new RegExp('(?:\\d+위\\s+)?((?:\\((?:주|유|합)\\)|㈜)?\\s*[가-힣A-Za-z0-9]+(?:\\s+[가-힣A-Za-z0-9]+)*?)\\s+[\\d,]+\\s+\\d+월\\s+' + escapedBiz);
    const rowMatch = fullText.match(bizRowRegex);
    if (rowMatch && rowMatch[1]) {
      const cand = cleanCandidate(rowMatch[1]);
      if (isValidCompanyName(cand)) {
        detectedName = cand;
      }
    }
  }

  // Priority 6: Filename clean parsing
  if (!detectedName && filename) {
    const cleanFn = filename
      .replace(/\.pdf$/i, '')
      .replace(/크레탑|기업정보보고서|기업정보|보고서|_|-|\s+/g, ' ')
      .trim();
    if (isValidCompanyName(cleanFn)) {
      detectedName = cleanFn;
    }
  }

  if (detectedName) {
    result.companyName = detectedName;
    result.confidenceNotes.push(`기업명 자동 추출: ${detectedName}`);
  } else {
    // DO NOT force a fake fallback name!
    result.confidenceNotes.push('기업명: 자동 식별을 완료하지 못했습니다. 확인 후 입력해 주세요.');
  }

  // 3. 결산일자 / 평가기준일
  const dateMatch =
    fullText.match(/결산일자\s*[:：]?\s*(\d{4}-\d{2}-\d{2})/) ||
    fullText.match(/기준일자\s*[:：]?\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    result.valuationDate = dateMatch[1].trim();
    result.confidenceNotes.push(`평가기준일(결산일): ${result.valuationDate}`);
  }

  // 4. 자본금 (Capital Stock)
  let capitalStock = 0;
  for (const page of pages) {
    if (page.includes('자본금(*)') || page.includes('보통주자본금')) {
      const capMatch =
        page.match(/(?:보통주자본금|자본금\(\*\))\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/);
      if (capMatch) {
        const val = parseCleanNumber(capMatch[3]);
        if (val > 0) {
          capitalStock = val * (page.includes('백만원') ? 1000000 : 1000);
          result.capitalStock = capitalStock;
          break;
        }
      }
    }
  }

  // 5. 자본금 변동현황 & 주식수 & 액면가
  let foundShares = false;
  for (const page of pages) {
    if (page.includes('자본금 변동현황') || page.includes('발행주식총수')) {
      const capChangeRegex =
        /발행주식총수[\s\S]*?(?:주당액면가\(원\))[\s\S]*?([\d,]+)\s+([\d,]+)\s+[\d,]+\s+[\d,]+\s+([\d,]+)/;
      const m = page.match(capChangeRegex);
      if (m) {
        const total = parseCleanNumber(m[1]);
        const face = parseCleanNumber(m[3]);
        if (total > 0 && face > 0) {
          result.totalShares = total;
          result.faceValue = face;
          foundShares = true;
          result.confidenceNotes.push(`발행주식총수: ${total.toLocaleString()}주, 액면가: ${face.toLocaleString()}원`);
          break;
        }
      }

      const sharesNumMatch = page.match(
        /(\d{1,3}(?:,\d{3})+|\d+)\s+(\d{1,3}(?:,\d{3})+|\d+)\s+0\s+0\s+(\d{1,3}(?:,\d{3})+|\d+)/
      );
      if (sharesNumMatch) {
        const total = parseCleanNumber(sharesNumMatch[1]);
        const face = parseCleanNumber(sharesNumMatch[3]);
        if (total >= 100 && face >= 100) {
          result.totalShares = total;
          result.faceValue = face;
          foundShares = true;
          result.confidenceNotes.push(`발행주식총수: ${total.toLocaleString()}주, 액면가: ${face.toLocaleString()}원`);
          break;
        }
      }
    }
  }

  // If still not found, parse "주요 주주현황" (Page 15)
  if (!foundShares) {
    for (const page of pages) {
      if (page.includes('주요 주주현황')) {
        const rowRegex =
          /([가-힣a-zA-Z]{2,10})\s+(최대주주|주주|기타주주|대표이사|사내이사|임원|친인척|특수관계인)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d.]+)/g;
        const matches = [...page.matchAll(rowRegex)];
        let totalFromSum = 0;
        let inferredTotal = 0;

        for (const m of matches) {
          const totalSharesInRow = parseCleanNumber(m[5]);
          const percent = parseFloat(m[6]);
          if (totalSharesInRow > 0) {
            totalFromSum += totalSharesInRow;
            if (percent > 0 && percent <= 100 && inferredTotal === 0) {
              inferredTotal = Math.round(totalSharesInRow / (percent / 100));
            }
          }
        }

        const candidateShares = totalFromSum > 0 ? totalFromSum : inferredTotal;
        if (candidateShares >= 100) {
          result.totalShares = candidateShares;
          foundShares = true;
          result.confidenceNotes.push(`주요 주주현황 합산 주식수: ${candidateShares.toLocaleString()}주`);
          break;
        }
      }
    }
  }

  // Calculate face value from capital stock & shares if available
  if (result.totalShares && capitalStock > 0) {
    const calcFace = Math.round(capitalStock / result.totalShares);
    if (calcFace >= 100 && calcFace <= 100000) {
      result.faceValue = calcFace;
      result.confidenceNotes.push(`자본금 및 주식수 역산 액면가: ${calcFace.toLocaleString()}원`);
    }
  } else if (result.totalShares && !result.faceValue) {
    result.faceValue = 5000; // standard Korean face value default
  }

  // 6. 재무상태표 (자산총계, 부채총계) - 단위: 천원
  let foundBalance = false;
  for (const page of pages) {
    // Look for year columns: e.g. 2023-12-31 2024-12-31 2025-12-31
    if (page.includes('자산(*)') || page.includes('부채(*)')) {
      const yearMatches = [...page.matchAll(/(\d{4})-12-31/g)].map((m) => parseInt(m[1], 10));
      const sortedYears = [...new Set(yearMatches)].sort((a, b) => a - b);
      if (sortedYears.length >= 3) {
        result.years = {
          n1: sortedYears[sortedYears.length - 1],
          n2: sortedYears[sortedYears.length - 2],
          n3: sortedYears[sortedYears.length - 3],
        };
      }

      // 자산(*) line
      const assetMatch = page.match(/자산\(\*\)\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/);
      if (assetMatch && !result.totalAssets) {
        const mult = page.includes('백만원') ? 1000000 : 1000;
        const n1Asset = parseCleanNumber(assetMatch[3]) * mult;
        if (n1Asset > 0) {
          result.totalAssets = n1Asset;
          result.confidenceNotes.push(`자산총계(재무상태표 환산): ${n1Asset.toLocaleString()}원`);
          foundBalance = true;
        }
      }

      // 부채(*) line
      const liabMatch = page.match(/부채\(\*\)\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/);
      if (liabMatch && !result.totalLiabilities) {
        const mult = page.includes('백만원') ? 1000000 : 1000;
        const n1Liab = parseCleanNumber(liabMatch[3]) * mult;
        if (n1Liab > 0) {
          result.totalLiabilities = n1Liab;
          result.confidenceNotes.push(`부채총계(재무상태표 환산): ${n1Liab.toLocaleString()}원`);
        }
      }
    }
  }

  // Fallback to 요약 재무상태표 (단위: 백만원)
  if (!result.totalAssets || !result.totalLiabilities) {
    for (const page of pages) {
      if (page.includes('요약 재무상태표') || (page.includes('자산총계') && page.includes('백만원'))) {
        const assetSummaryMatch = page.match(/자산총계\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/);
        if (assetSummaryMatch && !result.totalAssets) {
          const val = parseCleanNumber(assetSummaryMatch[3]) * 1000000;
          result.totalAssets = val;
          result.confidenceNotes.push(`자산총계(요약표 백만원 환산): ${val.toLocaleString()}원`);
        }
        const liabSummaryMatch = page.match(/부채총계\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/);
        if (liabSummaryMatch && !result.totalLiabilities) {
          const val = parseCleanNumber(liabSummaryMatch[3]) * 1000000;
          result.totalLiabilities = val;
          result.confidenceNotes.push(`부채총계(요약표 백만원 환산): ${val.toLocaleString()}원`);
        }
      }
    }
  }

  // 7. 손익계산서 (당기순이익 3개년 n-1, n-2, n-3)
  let foundProfit = false;
  for (const page of pages) {
    if (page.includes('손익계산서') || page.includes('이익잉여금처분계산서') || page.includes('당기순이익')) {
      const profitMatch = page.match(
        /(?:\*당기순이익|당기순이익\(순손실\)|당기순이익)\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/
      );
      if (profitMatch) {
        const isMillion = page.includes('백만원');
        const multiplier = isMillion ? 1000000 : 1000;

        const p3 = parseCleanNumber(profitMatch[1]) * multiplier; // n-3
        const p2 = parseCleanNumber(profitMatch[2]) * multiplier; // n-2
        const p1 = parseCleanNumber(profitMatch[3]) * multiplier; // n-1

        result.profitYear1 = p1;
        result.profitYear2 = p2;
        result.profitYear3 = p3;
        foundProfit = true;
        result.confidenceNotes.push(
          `최근 3개년 순손익: n-1: ${p1.toLocaleString()}원, n-2: ${p2.toLocaleString()}원, n-3: ${p3.toLocaleString()}원`
        );
        break;
      }
    }
  }

  // Fallback to 요약 손익계산서 (단위: 백만원)
  if (!foundProfit) {
    for (const page of pages) {
      if (page.includes('요약 손익계산서')) {
        const summaryProfitMatch = page.match(/당기순이익\s+([\d,-]+)\s+([\d,-]+)\s+([\d,-]+)/);
        if (summaryProfitMatch) {
          const multiplier = 1000000;
          result.profitYear3 = parseCleanNumber(summaryProfitMatch[1]) * multiplier;
          result.profitYear2 = parseCleanNumber(summaryProfitMatch[2]) * multiplier;
          result.profitYear1 = parseCleanNumber(summaryProfitMatch[3]) * multiplier;
          result.confidenceNotes.push(
            `요약 손익계산서 기준 순손익: n-1: ${result.profitYear1.toLocaleString()}원, n-2: ${result.profitYear2.toLocaleString()}원, n-3: ${result.profitYear3.toLocaleString()}원`
          );
          break;
        }
      }
    }
  }

  return result;
}
