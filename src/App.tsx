import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Calculator,
  RotateCcw,
  Printer,
  Save,
  FolderOpen,
  TrendingUp,
  Coins,
  Scale,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Percent,
  Layers,
  BarChart3,
  Sparkles,
  Download,
  Trash2,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check,
  Briefcase
} from 'lucide-react';
import { CurrencyInput } from './components/CurrencyInput';
import { CretopUploadModal } from './components/CretopUploadModal';
import { InheritanceTaxSavingsCard } from './components/InheritanceTaxSavingsCard';

// --- Data Types ---
export interface ValuationInput {
  companyName: string;
  valuationDate: string;
  totalShares: number | '';
  faceValue: number | '';
  weightProfit: number;
  weightAsset: number;
  discountRate: number; // percentage, e.g. 10.0
  profitYear1: number | ''; // n-1
  profitYear2: number | ''; // n-2
  profitYear3: number | ''; // n-3
  totalAssets: number | '';
  totalLiabilities: number | '';
}

export interface SavedSimulation {
  id: string;
  title: string;
  savedAt: string;
  data: ValuationInput;
  finalValuePerShare: number;
  totalEnterpriseValue: number;
  isFloorApplied: boolean;
}

// Completely empty/initialized input for entering brand-new company data
export const INITIAL_INPUT: ValuationInput = {
  companyName: '',
  valuationDate: new Date().toLocaleDateString('en-CA'),
  totalShares: '',
  faceValue: '',
  weightProfit: 3,
  weightAsset: 2,
  discountRate: 10.0,
  profitYear1: '',
  profitYear2: '',
  profitYear3: '',
  totalAssets: '',
  totalLiabilities: '',
};

export const DEFAULT_INPUT: ValuationInput = INITIAL_INPUT;
export const EMPTY_INPUT: ValuationInput = INITIAL_INPUT;

// --- Helpers for Korean Currency & Number Formatting ---
export function formatNumber(num: number | '' | undefined | null): string {
  if (num === '' || num === undefined || num === null || isNaN(Number(num))) return '0';
  return Math.round(Number(num)).toLocaleString('ko-KR');
}

export function formatPrecise(num: number | '' | undefined | null, decimals: number = 2): string {
  if (num === '' || num === undefined || num === null || isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKoreanUnit(num: number | '' | undefined | null): string {
  if (num === '' || num === undefined || num === null || isNaN(Number(num)) || Number(num) === 0) return '0원';
  const val = Number(num);
  const isNegative = val < 0;
  const absNum = Math.abs(val);

  const eok = Math.floor(absNum / 100000000);
  const man = Math.floor((absNum % 100000000) / 10000);
  const won = Math.floor(absNum % 10000);

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (won > 0 && eok === 0 && man === 0) parts.push(`${won.toLocaleString('ko-KR')}`);

  const formatted = parts.length > 0 ? parts.join(' ') + ' 원' : '0원';
  return isNegative ? `-${formatted}` : formatted;
}

// Corporate Tax Calculation for Korea (2024~2026 Standard Rates)
// 2억 이하: 9% (지방소득세 포함 9.9%)
// 2억 초과 ~ 200억 이하: 19% (지방소득세 포함 20.9%)
// 200억 초과 ~ 3000억 이하: 21% (지방소득세 포함 23.1%)
// 3000억 초과: 24% (지방소득세 포함 26.4%)
export function calculateCorporateTax(taxableIncome: number, includeLocalTax: boolean = true) {
  if (taxableIncome <= 0) {
    return { taxAmount: 0, effectiveTaxRate: 0, netIncome: taxableIncome };
  }

  let baseTax = 0;
  if (taxableIncome <= 200000000) {
    baseTax = taxableIncome * 0.09;
  } else if (taxableIncome <= 20000000000) {
    baseTax = 200000000 * 0.09 + (taxableIncome - 200000000) * 0.19;
  } else if (taxableIncome <= 300000000000) {
    baseTax =
      200000000 * 0.09 +
      (20000000000 - 200000000) * 0.19 +
      (taxableIncome - 20000000000) * 0.21;
  } else {
    baseTax =
      200000000 * 0.09 +
      (20000000000 - 200000000) * 0.19 +
      (300000000000 - 20000000000) * 0.21 +
      (taxableIncome - 300000000000) * 0.24;
  }

  const finalTax = includeLocalTax ? baseTax * 1.1 : baseTax;
  const netIncome = taxableIncome - finalTax;
  const effectiveTaxRate = (finalTax / taxableIncome) * 100;

  return {
    taxAmount: Math.round(finalTax),
    effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
    netIncome: Math.round(netIncome),
  };
}

export default function App() {
  const [input, setInput] = useState<ValuationInput>(DEFAULT_INPUT);
  const [savedList, setSavedList] = useState<SavedSimulation[]>([]);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [showTaxModal, setShowTaxModal] = useState<boolean>(false);
  const [targetTaxYear, setTargetTaxYear] = useState<'n1' | 'n2' | 'n3'>('n1');
  const [taxableIncomeInput, setTaxableIncomeInput] = useState<number>(100000000);
  const [includeLocalTax, setIncludeLocalTax] = useState<boolean>(true);
  const [simulationName, setSimulationName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guide'>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showCretopModal, setShowCretopModal] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Load saved simulations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hanwha_stock_simulations');
      if (stored) {
        setSavedList(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage
  const saveSimulation = () => {
    const title = simulationName.trim() || `${input.companyName} (${input.valuationDate})`;
    const newSim: SavedSimulation = {
      id: Date.now().toString(),
      title,
      savedAt: new Date().toLocaleString('ko-KR'),
      data: { ...input },
      finalValuePerShare: Math.round(calculations.finalValuePerShare),
      totalEnterpriseValue: Math.round(calculations.totalEnterpriseValue),
      isFloorApplied: calculations.isFloorApplied,
    };
    const updated = [newSim, ...savedList];
    setSavedList(updated);
    try {
      localStorage.setItem('hanwha_stock_simulations', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setSimulationName('');
    showToast(`✓ "${title}" 시뮬레이션이 안전하게 저장되었습니다.`);
  };

  const deleteSimulation = (id: string) => {
    const updated = savedList.filter((item) => item.id !== id);
    setSavedList(updated);
    try {
      localStorage.setItem('hanwha_stock_simulations', JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast('시뮬레이션이 삭제되었습니다.');
  };

  const loadSimulation = (sim: SavedSimulation) => {
    setInput({ ...sim.data });
    setShowSavedModal(false);
    showToast(`"${sim.title}" 시뮬레이션을 불러왔습니다.`);
  };

  const resetToDefault = () => {
    setInput({ ...EMPTY_INPUT });
    setSimulationName('');
    showToast('✓ 모든 입력란이 초기화되었습니다. 새로운 값을 입력해주세요.');
  };

  const handleApplyCretopData = (
    data: Partial<ValuationInput>,
    reportMeta?: { bizNo?: string; ceo?: string }
  ) => {
    const finalCompanyName = data.companyName?.trim() || input.companyName?.trim() || '';
    setInput((prev) => ({
      ...prev,
      ...data,
      ...(finalCompanyName ? { companyName: finalCompanyName } : {}),
    }));
    const extra = reportMeta?.ceo ? ` (대표: ${reportMeta.ceo})` : '';
    if (finalCompanyName) {
      showToast(`✓ '${finalCompanyName}'${extra} 회사명 및 재무제표 데이터가 자동 입력되었습니다!`);
    } else {
      showToast('✓ 재무제표 데이터가 자동 입력되었습니다! (회사명을 확인해주세요)');
    }
  };

  const handlePrint = () => {
    setActiveTab('dashboard');
    setShowPrintModal(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn('Browser print invocation:', err);
      }
    }, 150);
  };

  // Derive Years based on Valuation Date (defaults safely to current year if date is cleared)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const valYear = input.valuationDate ? parseInt(input.valuationDate.slice(0, 4), 10) : currentYear;
    const baseYear = isNaN(valYear) ? currentYear : valYear;
    return {
      n1: baseYear - 1,
      n2: baseYear - 2,
      n3: baseYear - 3,
    };
  }, [input.valuationDate]);

  // --- CORE CALCULATION ENGINE ---
  const calculations = useMemo(() => {
    const {
      totalShares,
      faceValue,
      weightProfit,
      weightAsset,
      discountRate,
      profitYear1,
      profitYear2,
      profitYear3,
      totalAssets,
      totalLiabilities,
    } = input;

    const numShares = typeof totalShares === 'number' && !isNaN(totalShares) ? totalShares : 0;
    const numFace = typeof faceValue === 'number' && !isNaN(faceValue) ? faceValue : 0;
    const numP1 = typeof profitYear1 === 'number' && !isNaN(profitYear1) ? profitYear1 : 0;
    const numP2 = typeof profitYear2 === 'number' && !isNaN(profitYear2) ? profitYear2 : 0;
    const numP3 = typeof profitYear3 === 'number' && !isNaN(profitYear3) ? profitYear3 : 0;
    const numAssets = typeof totalAssets === 'number' && !isNaN(totalAssets) ? totalAssets : 0;
    const numLiabilities = typeof totalLiabilities === 'number' && !isNaN(totalLiabilities) ? totalLiabilities : 0;

    const validShares = numShares > 0 ? numShares : 1;
    const rateDecimal = discountRate > 0 ? discountRate / 100 : 0.1;

    // 1) 가중평균 순손익액 = ( (n-1)*3 + (n-2)*2 + (n-3)*1 ) / 6
    const weightedProfitSum = numP1 * 3 + numP2 * 2 + numP3 * 1;
    const weightedProfitLoss = weightedProfitSum / 6;

    // 2) 1주당 순손익가치 = (가중평균 순손익액 / 발행주식총수) / 순손익환원율(0.10)
    // 상증령 제54조 제1항: 1주당 순손익가치가 음수인 경우 0원으로 평가
    const rawProfitPerShare = numShares > 0 ? weightedProfitLoss / validShares : 0;
    const profitValuePerShare = numShares > 0 ? Math.max(0, rawProfitPerShare / rateDecimal) : 0;

    // 3) 순자산가액 및 1주당 순자산가치
    // 순자산가액 = 자산총계 - 부채총계
    // 1주당 순자산가치 = 순자산가액 / 발행주식총수 (음수일 경우 상증령 제54조 제2항에 따라 0원 처리)
    const netAssetValue = numAssets - numLiabilities;
    const rawAssetPerShare = numShares > 0 ? netAssetValue / validShares : 0;
    const netAssetValuePerShare = numShares > 0 ? Math.max(0, rawAssetPerShare) : 0;

    // 4) 가중평균 평가액(1주당)
    // = (1주당 순손익가치 * 순손익가중치 + 1주당 순자산가치 * 순자산가중치) / (가중치합)
    const totalWeight = weightProfit + weightAsset > 0 ? weightProfit + weightAsset : 1;
    const weightedValuePerShare =
      (profitValuePerShare * weightProfit + netAssetValuePerShare * weightAsset) / totalWeight;

    // 순자산가치 80% 하한선 = 1주당 순자산가치 * 0.8
    // 상속세 및 증여세법 시행령 제54조 제2항 규정
    const floorValuePerShare = netAssetValuePerShare * 0.8;

    // 최종 1주당 평가액 = MAX(가중평균 평가액, 순자산가치 80% 하한선)
    const isFloorApplied =
      numShares > 0 && floorValuePerShare > 0 && floorValuePerShare > weightedValuePerShare;
    const finalValuePerShare =
      numShares > 0 ? Math.max(weightedValuePerShare, floorValuePerShare) : 0;

    // 5) 총 기업가치 = 최종 1주당 평가액 * 발행주식총수
    const totalEnterpriseValue = finalValuePerShare * numShares;

    // 자본금 & 배율 지표
    const capitalStock = numShares * numFace;
    const faceMultiple = numFace > 0 && finalValuePerShare > 0 ? finalValuePerShare / numFace : 0;
    const pbr = netAssetValuePerShare > 0 && finalValuePerShare > 0 ? finalValuePerShare / netAssetValuePerShare : 0;
    const per = rawProfitPerShare > 0 && finalValuePerShare > 0 ? finalValuePerShare / rawProfitPerShare : 0;
    const diffFromFloor = Math.max(0, floorValuePerShare - weightedValuePerShare);

    return {
      weightedProfitSum,
      weightedProfitLoss,
      rawProfitPerShare,
      profitValuePerShare,
      netAssetValue,
      netAssetValuePerShare,
      totalWeight,
      weightedValuePerShare,
      floorValuePerShare,
      isFloorApplied,
      finalValuePerShare,
      totalEnterpriseValue,
      capitalStock,
      faceMultiple,
      pbr,
      per,
      diffFromFloor,
    };
  }, [input]);

  // Copy Summary to Clipboard
  const copySummary = () => {
    const summaryText = `[한화피플라이프 대전글로리사업단 비상장주식가치 평가 결과]
• 회사명: ${input.companyName || '미입력'}
• 평가기준일: ${input.valuationDate || '미입력'}
• 발행주식총수: ${input.totalShares ? formatNumber(input.totalShares) + ' 주' : '미입력'} (액면가 ${input.faceValue ? formatNumber(input.faceValue) + '원' : '미입력'})
----------------------------------------
■ 1주당 순손익가치: ${formatNumber(calculations.profitValuePerShare)} 원
■ 1주당 순자산가치: ${formatNumber(calculations.netAssetValuePerShare)} 원
■ 가중평균 평가액: ${formatNumber(calculations.weightedValuePerShare)} 원 (가중치 ${input.weightProfit}:${input.weightAsset})
■ 순자산가치 80% 하한선: ${formatNumber(calculations.floorValuePerShare)} 원
----------------------------------------
★ 최종 1주당 평가액: ${formatNumber(calculations.finalValuePerShare)} 원 ${calculations.isFloorApplied ? '(순자산 80% 하한선 적용)' : ''}
★ 총 기업가치 (시가총액): ${formatNumber(calculations.totalEnterpriseValue)} 원 (${formatKoreanUnit(calculations.totalEnterpriseValue)})
★ 액면가 대비 배수: ${calculations.faceMultiple.toFixed(2)}배 (자본금 ${formatKoreanUnit(calculations.capitalStock)})`;

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Preset Weight Handlers
  const applyPresetWeight = (pWeight: number, aWeight: number) => {
    setInput((prev) => ({
      ...prev,
      weightProfit: pWeight,
      weightAsset: aWeight,
    }));
  };

  // Corporate Tax Calculation for Modal
  const taxCalcResult = useMemo(() => {
    return calculateCorporateTax(taxableIncomeInput, includeLocalTax);
  }, [taxableIncomeInput, includeLocalTax]);

  const applyCalculatedNetIncome = () => {
    if (targetTaxYear === 'n1') {
      setInput((prev) => ({ ...prev, profitYear1: taxCalcResult.netIncome }));
    } else if (targetTaxYear === 'n2') {
      setInput((prev) => ({ ...prev, profitYear2: taxCalcResult.netIncome }));
    } else {
      setInput((prev) => ({ ...prev, profitYear3: taxCalcResult.netIncome }));
    }
    setShowTaxModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between print:bg-white print:pb-0">
      {/* ── HEADER ── */}
      <header className="px-3.5 sm:px-8 py-2.5 sm:py-3.5 bg-[#1E293B] text-white border-b-4 border-[#F37321] sticky top-0 z-30 shadow-md no-print">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Brand Emblem (Official Hanwha Logo) */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden shadow-sm shrink-0 border border-orange-400/40 bg-[#F37321] flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="한화 로고"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              {/* Brand and Branch Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                  한화피플라이프
                </h1>
                <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-[#F37321] border border-orange-500/30 whitespace-nowrap">
                  대전글로리사업단
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                상증세법 기준 비상장주식가치 평가 솔루션
              </p>
            </div>
          </div>

          {/* Header Action Buttons (4 concise buttons with icons/English abbreviations in a single line) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-nowrap pt-1 sm:pt-0 border-t border-slate-700/60 sm:border-t-0">
            {/* 1. AUTO (크레탑 PDF 자동입력) */}
            <button
              onClick={() => setShowCretopModal(true)}
              className="px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-md bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white transition flex items-center space-x-1 cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
              title="크레탑(CRETOP) PDF 자동입력 (AUTO)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>AUTO</span>
            </button>

            {/* 2. SAVED (저장 목록) */}
            <button
              onClick={() => setShowSavedModal(true)}
              className="px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1 cursor-pointer shrink-0 whitespace-nowrap"
              title="저장된 시뮬레이션 목록 (SAVED)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#F37321]" />
              <span>SAVED</span>
              {savedList.length > 0 && (
                <span className="bg-[#F37321] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                  {savedList.length}
                </span>
              )}
            </button>

            {/* 3. RESET (초기화) */}
            <button
              onClick={resetToDefault}
              className="px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center space-x-1 cursor-pointer shrink-0 whitespace-nowrap"
              title="입력값 기본 초기화 (RESET)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>RESET</span>
            </button>

            {/* 4. PDF (결과 보고서 출력) */}
            <button
              onClick={handlePrint}
              className="bg-[#F37321] hover:bg-[#D6621B] px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-white transition-colors flex items-center space-x-1 cursor-pointer text-xs shadow-xs shrink-0 whitespace-nowrap"
              title="평가 결과보고서 PDF 출력 (PDF)"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-2xl border border-orange-500/40 text-xs font-semibold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#F37321]"></span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </header>

      {/* ── PRINT ONLY EXECUTIVE REPORT (Displays on PDF / Print) ── */}
      <div className="print-only p-6 bg-white max-w-5xl mx-auto">
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
          <div className="flex items-start gap-3">
            <img
              src="/logo.svg"
              alt="한화 로고"
              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
            />
            <div>
              <div className="text-[11px] font-extrabold text-orange-600 tracking-wider">
                HANWHA PEOPLELIFE DAEJEON GLORY BUSINESS UNIT
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">
                비상장주식 가치평가 결과보고서
              </h1>
              <p className="text-[11px] text-slate-500">
                상속세 및 증여세법 제60조, 제63조 및 동법 시행령 제54조(비상장주식의 평가) 기준
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600 space-y-0.5">
            <div>
              <span className="font-bold text-slate-800">평가대상:</span> {input.companyName || '미지정'}
            </div>
            <div>
              <span className="font-bold text-slate-800">평가기준일:</span> {input.valuationDate || '미지정'}
            </div>
            <div>
              <span className="font-bold text-slate-800">발행주식:</span>{' '}
              {input.totalShares ? `${formatNumber(input.totalShares)}주` : '-'}{' '}
              {input.faceValue ? `(액면가 ${formatNumber(input.faceValue)}원)` : ''}
            </div>
            <div>
              <span className="font-bold text-slate-800">작성부서:</span> 한화피플라이프
              대전글로리사업단
            </div>
          </div>
        </div>

        {/* Print Executive Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 border-2 border-slate-900 rounded-lg bg-slate-50">
            <div className="text-[10px] font-bold text-slate-500">최종 1주당 확정 평가액</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {formatNumber(calculations.finalValuePerShare)} 원
            </div>
            <div className="text-[10px] text-orange-700 font-bold mt-0.5">
              {calculations.isFloorApplied
                ? '★ 순자산가치 80% 하한선 규정 적용'
                : '가중평균가액 적용'}
            </div>
          </div>

          <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
            <div className="text-[10px] font-bold text-slate-500">총 기업가치 (시가총액)</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {formatNumber(calculations.totalEnterpriseValue)} 원
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {formatKoreanUnit(calculations.totalEnterpriseValue)}
            </div>
          </div>

          <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
            <div className="text-[10px] font-bold text-slate-500">자본금 대비 평가배수</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {calculations.faceMultiple.toFixed(2)} 배
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              자본금 {formatKoreanUnit(calculations.capitalStock)} (액면가{' '}
              {formatNumber(input.faceValue)}원)
            </div>
          </div>
        </div>

        {/* Print Inputs Summary Table */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1">
            <span>■</span> 평가 기초 데이터 요약
          </h4>
          <table className="w-full text-left text-[11px] border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-200">
                <th className="bg-slate-100 p-2 font-bold w-1/4 border-r border-slate-200">
                  회사명 / 기준일
                </th>
                <td className="p-2 border-r border-slate-200">
                  {input.companyName || '미지정'} ({input.valuationDate || '기준일 미지정'})
                </td>
                <th className="bg-slate-100 p-2 font-bold w-1/4 border-r border-slate-200">
                  평가 가중치 / 환원율
                </th>
                <td className="p-2">
                  순손익 {input.weightProfit} : 순자산 {input.weightAsset} (환원율{' '}
                  {input.discountRate}%)
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <th className="bg-slate-100 p-2 font-bold border-r border-slate-200">
                  최근 3개년 순손익액
                </th>
                <td className="p-2 border-r border-slate-200 font-mono" colSpan={3}>
                  1년차(n-1): {formatNumber(input.profitYear1)}원 | 2년차(n-2):{' '}
                  {formatNumber(input.profitYear2)}원 | 3년차(n-3):{' '}
                  {formatNumber(input.profitYear3)}원
                </td>
              </tr>
              <tr>
                <th className="bg-slate-100 p-2 font-bold border-r border-slate-200">
                  자산 및 부채 현황
                </th>
                <td className="p-2 font-mono" colSpan={3}>
                  자산총계: {formatNumber(input.totalAssets)}원 ({formatKoreanUnit(input.totalAssets)}
                  ) - 부채총계: {formatNumber(input.totalLiabilities)}원 (
                  {formatKoreanUnit(input.totalLiabilities)}) = 순자산가액:{' '}
                  <strong>{formatNumber(calculations.netAssetValue)}원</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation / Mode Pill Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 sm:mb-6 no-print">
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs max-w-full">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-bold text-slate-700 whitespace-nowrap">실시간 연동 엔진</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 truncate text-[11px] sm:text-xs">
              대상: <strong className="text-slate-800">{input.companyName || '미입력'}</strong> ({input.valuationDate || '기준일 미지정'})
            </span>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto max-w-full pb-0.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#F37321] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              평가 대시보드
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-[#F37321] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span className="hidden sm:inline">상증세법 법률 가이드 & 영업 전략</span>
              <span className="sm:hidden">법률 가이드</span>
            </button>
            <button
              onClick={copySummary}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center space-x-1 whitespace-nowrap cursor-pointer"
              title="평가 결과 텍스트 복사"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-bold">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="hidden sm:inline">결과 요약 복사</span>
                  <span className="sm:hidden">복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── TAB CONTENT: DASHBOARD ── */}
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
            {/* ── LEFT COLUMN: INPUT FORMS (5 cols) ── */}
            <div className="lg:col-span-5 space-y-4 no-print">
              {/* Card 1: 기업 기본 정보 */}
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-4 text-[#F37321] border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#F37321]" />
                    <h2 className="font-bold text-sm uppercase tracking-wide text-slate-800">
                      기업 기본 정보
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">기본 제원 설정</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* 회사명 & 평가기준일 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">회사명</label>
                      <input
                        type="text"
                        value={input.companyName}
                        onChange={(e) =>
                          setInput((prev) => ({ ...prev, companyName: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#F37321] focus:border-[#F37321] outline-none transition"
                        placeholder="회사명 입력"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        평가기준일
                      </label>
                      <input
                        type="date"
                        value={input.valuationDate}
                        onChange={(e) =>
                          setInput((prev) => ({ ...prev, valuationDate: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#F37321] focus:border-[#F37321] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 발행주식총수 & 1주당 액면가액 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">발행주식총수</label>
                      <CurrencyInput
                        id="input-total-shares"
                        value={input.totalShares}
                        placeholder="예: 20,000"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            totalShares: val,
                          }))
                        }
                        suffix="주"
                        className="w-full px-3 py-1.5 pr-8 bg-slate-50 border border-slate-300 rounded text-sm font-mono text-right font-semibold text-slate-800 focus:ring-1 focus:ring-[#F37321] focus:border-[#F37321] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">1주당 액면가액</label>
                      <CurrencyInput
                        id="input-face-value"
                        value={input.faceValue}
                        placeholder="예: 10,000"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            faceValue: val,
                          }))
                        }
                        suffix="원"
                        className="w-full px-3 py-1.5 pr-8 bg-slate-50 border border-slate-300 rounded text-sm font-mono text-right font-semibold text-slate-800 focus:ring-1 focus:ring-[#F37321] focus:border-[#F37321] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 자본금 표시 배지 */}
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">법인 등기 자본금</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatNumber(calculations.capitalStock)} 원{' '}
                      <span className="text-slate-400 text-[11px] font-normal">
                        ({formatKoreanUnit(calculations.capitalStock)})
                      </span>
                    </span>
                  </div>

                  {/* 순손익/순자산 가중치 & 프리셋 */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-700 font-bold flex items-center gap-1">
                        평가 가중치 설정 (순손익 : 순자산)
                      </label>
                      <span className="text-[11px] font-bold text-[#F37321] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {input.weightProfit} : {input.weightAsset}
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                      <button
                        type="button"
                        onClick={() => applyPresetWeight(3, 2)}
                        className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                          input.weightProfit === 3 && input.weightAsset === 2
                            ? 'bg-[#F37321] text-white border-[#F37321] shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        일반법인 (3:2)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetWeight(2, 3)}
                        className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                          input.weightProfit === 2 && input.weightAsset === 3
                            ? 'bg-[#F37321] text-white border-[#F37321] shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="부동산자산 비율 50% 이상 법인"
                      >
                        부동산과다 (2:3)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetWeight(0, 5)}
                        className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                          input.weightProfit === 0 && input.weightAsset === 5
                            ? 'bg-[#F37321] text-white border-[#F37321] shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="순자산가치 100% 적용법인 (부동산 80% 이상, 휴폐업, 3년 미만 등)"
                      >
                        순자산100% (0:5)
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">
                          순손익 가중치
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={input.weightProfit}
                          onChange={(e) =>
                            setInput((prev) => ({
                              ...prev,
                              weightProfit: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#F37321]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">
                          순자산 가중치
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={input.weightAsset}
                          onChange={(e) =>
                            setInput((prev) => ({
                              ...prev,
                              weightAsset: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#F37321]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">
                          순손익 환원율
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={input.discountRate}
                            onChange={(e) =>
                              setInput((prev) => ({
                                ...prev,
                                discountRate: parseFloat(e.target.value) || 10,
                              }))
                            }
                            className="w-full px-2 py-1.5 pr-6 bg-slate-50 border border-slate-300 rounded font-semibold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#F37321]"
                          />
                          <span className="absolute right-2 top-1.5 text-slate-400 font-medium">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: 최근 3개년 순손익액 (원) */}
              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between pb-1.5 mb-2.5 text-[#F37321] border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#F37321]" />
                    <h2 className="font-bold text-sm uppercase tracking-wide text-slate-800">
                      최근 3개년 순손익액 (원)
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setTargetTaxYear('n1');
                      setShowTaxModal(true);
                    }}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-[#F37321]" />
                    <span>법인세율 자동계산기</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {/* n-1 년차 (가중치 3) */}
                  <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="w-5 h-5 rounded-full bg-[#1E293B] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                        {years.n1}년도
                      </span>
                      <span className="text-[10px] text-orange-700 font-semibold bg-orange-100/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                        가중치 3
                      </span>
                    </div>
                    <div className="flex-1 max-w-[190px] sm:max-w-[220px]">
                      <CurrencyInput
                        id="input-profit-year1"
                        value={input.profitYear1}
                        allowNegative={true}
                        placeholder="0"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            profitYear1: val,
                          }))
                        }
                        suffix="원"
                        className="w-full px-2.5 py-1 sm:py-1.5 pr-7 bg-white border border-slate-300 rounded font-mono font-bold text-right text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#F37321] transition"
                      />
                    </div>
                  </div>

                  {/* n-2 년차 (가중치 2) */}
                  <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="w-5 h-5 rounded-full bg-slate-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                        {years.n2}년도
                      </span>
                      <span className="text-[10px] text-slate-600 font-semibold bg-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                        가중치 2
                      </span>
                    </div>
                    <div className="flex-1 max-w-[190px] sm:max-w-[220px]">
                      <CurrencyInput
                        id="input-profit-year2"
                        value={input.profitYear2}
                        allowNegative={true}
                        placeholder="0"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            profitYear2: val,
                          }))
                        }
                        suffix="원"
                        className="w-full px-2.5 py-1 sm:py-1.5 pr-7 bg-white border border-slate-300 rounded font-mono font-bold text-right text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#F37321] transition"
                      />
                    </div>
                  </div>

                  {/* n-3 년차 (가중치 1) */}
                  <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="w-5 h-5 rounded-full bg-slate-400 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                        {years.n3}년도
                      </span>
                      <span className="text-[10px] text-slate-600 font-semibold bg-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                        가중치 1
                      </span>
                    </div>
                    <div className="flex-1 max-w-[190px] sm:max-w-[220px]">
                      <CurrencyInput
                        id="input-profit-year3"
                        value={input.profitYear3}
                        allowNegative={true}
                        placeholder="0"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            profitYear3: val,
                          }))
                        }
                        suffix="원"
                        className="w-full px-2.5 py-1 sm:py-1.5 pr-7 bg-white border border-slate-300 rounded font-mono font-bold text-right text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#F37321] transition"
                      />
                    </div>
                  </div>

                  {/* 실시간 가중평균 순손익액 결과 박스 */}
                  <div className="p-2.5 rounded-lg bg-[#1E293B] text-white flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">가중평균 순손익액 산출치</div>
                      <div className="text-[10px] text-slate-400">
                        공식: ({years.n1}년×3 + {years.n2}년×2 + {years.n3}년×1) ÷ 6
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#F37321]">
                        {formatNumber(calculations.weightedProfitLoss)} 원
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatKoreanUnit(calculations.weightedProfitLoss)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: 순자산가액 산정 (원) */}
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-4 text-[#F37321] border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#F37321]" />
                    <h2 className="font-bold text-sm uppercase tracking-wide text-slate-800">
                      순자산가액 산정 (원)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400">기준일 대차대조표</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* 자산총계 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      자산총계 (Total Assets)
                    </label>
                    <div>
                      <CurrencyInput
                        id="input-total-assets"
                        value={input.totalAssets}
                        placeholder="0"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            totalAssets: val,
                          }))
                        }
                        suffix="원"
                        suffixClassName="text-blue-500 font-medium"
                        className="w-full px-3 py-1.5 pr-8 bg-blue-50 border border-blue-200 rounded text-sm font-mono text-right font-bold text-blue-700 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* 부채총계 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      부채총계 (Total Liabilities)
                    </label>
                    <div>
                      <CurrencyInput
                        id="input-total-liabilities"
                        value={input.totalLiabilities}
                        placeholder="0"
                        onChange={(val) =>
                          setInput((prev) => ({
                            ...prev,
                            totalLiabilities: val,
                          }))
                        }
                        suffix="원"
                        suffixClassName="text-red-500 font-medium"
                        className="w-full px-3 py-1.5 pr-8 bg-red-50 border border-red-200 rounded text-sm font-mono text-right font-bold text-red-700 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* 자동 계산된 순자산가액 박스 */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">
                        순자산가액 (자산 - 부채)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatKoreanUnit(calculations.netAssetValue)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-[#F37321]">
                        {formatNumber(calculations.netAssetValue)} 원
                      </div>
                      <div className="text-[10px] text-slate-500">
                        1주당: {formatNumber(calculations.netAssetValuePerShare)} 원
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 시뮬레이션 저장 빠른 액션 바 */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-2">
                <input
                  type="text"
                  value={simulationName}
                  onChange={(e) => setSimulationName(e.target.value)}
                  placeholder="시뮬레이션 명칭 (예: A사 가업승계 1차안)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#F37321]"
                />
                <button
                  onClick={saveSimulation}
                  className="px-3.5 py-1.5 text-xs font-bold rounded bg-[#1E293B] hover:bg-slate-700 text-white transition flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5 text-[#F37321]" />
                  <span>저장</span>
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN: RESULTS DASHBOARD (7 cols) ── */}
            <div className="lg:col-span-7 space-y-5 print:w-full print:space-y-4">
              {/* ── HERO METRIC CARDS ── */}
              <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] rounded-2xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden print:bg-white print:text-slate-900 print:border-slate-300 print:shadow-none">
                {/* Decorative glow background */}
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#F37321] opacity-15 rounded-full blur-3xl pointer-events-none no-print"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#F37321] opacity-10 rounded-full blur-2xl pointer-events-none no-print"></div>

                {/* Top status bar inside Hero */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-700/80 mb-5 print:border-slate-200">
                  {/* 80% Floor Badge (Dynamic) - Starts with 가중평균가액 정상 적용 */}
                  <div className="flex items-center space-x-2">
                    {calculations.finalValuePerShare === 0 && (!input.totalShares || input.totalShares === 0) ? (
                      <div className="bg-slate-700/90 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-slate-300 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span>평가 기초데이터 입력 대기</span>
                      </div>
                    ) : calculations.isFloorApplied ? (
                      <div className="bg-[#F37321] text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 animate-pulse print:bg-amber-100 print:text-amber-900 print:border-amber-300">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span>순자산 80% 하한선 규정 적용</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 print:bg-emerald-100 print:text-emerald-900 print:border-emerald-300">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span>가중평균가액 정상 적용</span>
                      </div>
                    )}
                  </div>

                  {input.companyName && (
                    <span className="text-xs text-slate-300 font-medium print:text-slate-600">
                      {input.companyName}
                    </span>
                  )}
                </div>

                {/* Main Double KPI: 1주당 평가액 & 총 기업가치 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  {/* KPI 1: 최종 1주당 평가액 */}
                  <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-inner print:bg-slate-50 print:border-slate-300 print:shadow-none">
                    <div className="text-xs font-semibold text-slate-400 mb-1 print:text-slate-600">
                      <span>최종 1주당 평가액 (Max 기준)</span>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono print:text-slate-900">
                        {formatNumber(calculations.finalValuePerShare)}
                      </span>
                      <span className="text-base font-bold text-[#F37321] print:text-orange-600">원 / 주</span>
                    </div>
                    <div className="mt-2 text-xs flex items-center justify-between text-slate-300 pt-2 border-t border-slate-700/60 print:border-slate-200 print:text-slate-700">
                      <span>
                        액면가 {input.faceValue ? `${formatNumber(input.faceValue)}원` : '0원'} 대비
                      </span>
                      <span className="font-extrabold text-[#F37321] font-mono text-sm print:text-amber-700">
                        {input.faceValue && calculations.faceMultiple > 0
                          ? `${calculations.faceMultiple.toFixed(2)} 배`
                          : '- 배'}
                      </span>
                    </div>
                  </div>

                  {/* KPI 2: 총 기업가치 */}
                  <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-inner print:bg-slate-50 print:border-slate-300 print:shadow-none">
                    <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between print:text-slate-600">
                      <span>총 기업가치 (시가총액)</span>
                      <span className="text-[10px] text-slate-400 font-mono print:text-slate-500">
                        {formatNumber(input.totalShares)} 주 기준
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono print:text-amber-800">
                        {formatNumber(calculations.totalEnterpriseValue)}
                      </span>
                      <span className="text-base font-bold text-slate-300 print:text-slate-600">원</span>
                    </div>
                    <div className="mt-2 text-xs flex items-center justify-between text-slate-300 pt-2 border-t border-slate-700/60 print:border-slate-200 print:text-slate-700">
                      <span>단위 환산 요약</span>
                      <span className="font-bold text-[#F37321] print:text-amber-800">
                        {formatKoreanUnit(calculations.totalEnterpriseValue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floor Alert Banner if Floor is Applied */}
                {calculations.isFloorApplied && (
                  <div className="mt-5 p-3.5 rounded-xl bg-[#F37321]/15 border border-[#F37321]/40 text-orange-200 text-xs space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-[#F37321]">
                      <AlertTriangle className="w-4 h-4 text-[#F37321] shrink-0" />
                      <span>상증세법 시행령 제54조 제2항 하한선 규정 발동</span>
                    </div>
                    <p className="leading-relaxed text-slate-200 text-[11px]">
                      본 기업의 순손익가치와 순자산가치 가중평균치(
                      <strong className="text-white">
                        {formatNumber(calculations.weightedValuePerShare)}원
                      </strong>
                      )가 1주당 순자산가치의 80%(
                      <strong className="text-[#F37321]">
                        {formatNumber(calculations.floorValuePerShare)}원
                      </strong>
                      )에 미달하므로, 법정 규정에 따라{' '}
                      <strong className="text-[#F37321]">순자산가치의 80% 가액</strong>이 최종
                      평가액으로 의제되었습니다. (가중평균 대비{' '}
                      <strong className="text-white">
                        +{formatNumber(calculations.diffFromFloor)}원
                      </strong>{' '}
                      상향 평가됨)
                    </p>
                  </div>
                )}
              </div>

              {/* ── VISUAL COMPARISON CARD ── */}
              <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-4 text-[#F37321] border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-[#F37321]" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                        핵심 평가요소 4대 지표 비교
                      </h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    1주당 가치 기준
                  </span>
                </div>

                {/* 4 Metric Bar Visuals */}
                <div className="space-y-4 text-xs">
                  {/* Metric 1: 1주당 순손익가치 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                        1주당 순손익가치 (Profit Value)
                      </span>
                      <span className="font-mono font-bold text-blue-700">
                        {formatNumber(calculations.profitValuePerShare)} 원
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (calculations.profitValuePerShare /
                              Math.max(
                                calculations.profitValuePerShare,
                                calculations.netAssetValuePerShare,
                                1
                              )) *
                              100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>가중평균 3개년 순손익액 환원 (환원율 10%)</span>
                      <span>가중치: {input.weightProfit}</span>
                    </div>
                  </div>

                  {/* Metric 2: 1주당 순자산가치 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                        1주당 순자산가치 (Asset Value)
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatNumber(calculations.netAssetValuePerShare)} 원
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (calculations.netAssetValuePerShare /
                              Math.max(
                                calculations.profitValuePerShare,
                                calculations.netAssetValuePerShare,
                                1
                              )) *
                              100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>순자산가액 ÷ 발행주식수</span>
                      <span>가중치: {input.weightAsset}</span>
                    </div>
                  </div>

                  {/* Metric 3: 가중평균 평가액 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-slate-500"></span>
                        가중평균 평가액 ({input.weightProfit}:{input.weightAsset})
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {formatNumber(calculations.weightedValuePerShare)} 원
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-slate-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (calculations.weightedValuePerShare /
                              Math.max(
                                calculations.profitValuePerShare,
                                calculations.netAssetValuePerShare,
                                1
                              )) *
                              100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>
                        (손익가치×{input.weightProfit} + 자산가치×{input.weightAsset}) ÷{' '}
                        {calculations.totalWeight}
                      </span>
                      <span>하한선 미달 여부 판정 기준</span>
                    </div>
                  </div>

                  {/* Metric 4: 순자산 80% 하한선 & 최종가액 */}
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-orange-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-[#F37321]"></span>
                        순자산가치 80% 하한선
                      </span>
                      <span className="font-mono font-bold text-[#F37321]">
                        {formatNumber(calculations.floorValuePerShare)} 원
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white rounded-full overflow-hidden flex border border-orange-200">
                      <div
                        className="h-full bg-[#F37321] rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (calculations.floorValuePerShare /
                              Math.max(
                                calculations.profitValuePerShare,
                                calculations.netAssetValuePerShare,
                                1
                              )) *
                              100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-orange-900 mt-1">
                      <span>최종 1주당 확정 평가액</span>
                      <span className="font-mono text-sm text-[#F37321]">
                        {formatNumber(calculations.finalValuePerShare)} 원
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── INHERITANCE TAX SAVINGS PREDICTION CARD (10% ~ 50% RATES) ── */}
              <InheritanceTaxSavingsCard
                totalEnterpriseValue={calculations.totalEnterpriseValue}
                companyName={input.companyName}
              />

              {/* ── CONSULTANT STRATEGY BRIEFING CARD ── */}
              <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 mb-4">
                  <Briefcase className="w-5 h-5 text-[#F37321]" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                      한화피플라이프 대전글로리사업단 컨설턴트 핵심 영업 제안 포인트
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Point 1 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F37321]"></span>
                      {calculations.isFloorApplied
                        ? '순자산 80% 하한선 완화 전략 (잉여금 플랜)'
                        : '손익 변동 주기 포착 가업승계 타이밍'}
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {calculations.isFloorApplied
                        ? '현재 순자산 규모에 비해 최근 순이익이 낮아 순자산 하한선(80%) 규정이 적용되었습니다. 이익잉여금의 적시 처분(배당, 자기주식 유상감자) 및 임원 퇴직금 중간정산 등을 통한 순자산가치 슬림화 컨설팅이 주효합니다.'
                        : '순손익가치가 높게 반영되어 평가액이 형성되어 있습니다. 신규 설비투자나 연구개발비 집행 연도 등 순손익이 일시적으로 감소하는 최적의 증여 타이밍을 포착해 승계 증여를 실행하는 방안을 제안하세요.'}
                    </p>
                  </div>

                  {/* Point 2 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      대표이사 가지급금 & 퇴직금 규정 정비
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      법인 자산총계 내 가지급금 인정이자 및 상여 처분 리스크를 방어하고, 정관상 임원
                      퇴직급여 지급규정을 한화피플라이프 표준 정관으로 정비하여 합법적인 비용 인정을
                      통한 주가 관리 방안을 제시하십시오.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── TAB CONTENT: STATUTORY GUIDE & RULES ── */
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 no-print">
            <div>
              <span className="text-xs font-bold text-[#F37321] uppercase tracking-wider">
                LEGAL BASIS & CONSULTING MANUAL
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                상속세 및 증여세법상 비상장주식 평가 규정 해설
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                한화피플라이프 대전글로리사업단 컨설턴트들이 숙지해야 할 상증세법 핵심 조항 및
                예외규정 정리
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              {/* Box 1 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#F37321] flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  상증세법 시행령 제54조 (평가원칙)
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  비상장주식은 원칙적으로 1주당 순손익가치와 1주당 순자산가치를 각각{' '}
                  <strong className="text-slate-800">3 : 2</strong>의 비율로 가중평균하여
                  평가합니다.
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                  평가액 = (순손익가치×3 + 순자산가치×2) ÷ 5
                </div>
              </div>

              {/* Box 2 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#F37321] flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  시행령 제54조 제2항 (80% 하한선 규정)
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  가중평균한 1주당 가액이 1주당 순자산가치의{' '}
                  <strong className="text-[#F37321]">80%에 미달하는 경우</strong>에는 순자산가치의
                  80%에 상당하는 금액을 1주당 평가액으로 합니다.
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                  최종평가액 = MAX(가중평균액, 순자산가치×80%)
                </div>
              </div>

              {/* Box 3 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-bold text-slate-800 text-sm">부동산 과다보유 법인의 특례</h3>
                <p className="text-slate-600 leading-relaxed">
                  자산총계 중 부동산 및 부동산에 관한 권리의 합계액이 50% 이상인 법인은 순손익가치와
                  순자산가치 비율을 <strong className="text-slate-800">2 : 3</strong>으로 역전하여
                  적용합니다. (부동산 80% 이상은 순자산 100%)
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                  가중비율 = 손익 2 : 자산 3
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#1E293B] text-white space-y-4">
              <h3 className="text-sm font-bold text-[#F37321] flex items-center gap-2 uppercase tracking-wide">
                <ShieldCheck className="w-5 h-5 text-[#F37321]" />
                비상장주식 가치평가 컨설팅 시 주의사항
              </h3>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  <strong>순손익액 산정:</strong> 법인세법상 각 사업연도 소득금액을 기준으로 하되,
                  국세환급금 이자 등 익금불산입 및 기부금 한도초과액, 과태료 등 손금불산입 항목을
                  조정하여 산정해야 합니다.
                </li>
                <li>
                  <strong>순손익환원율:</strong> 기획재정부령으로 정하는 율(현재 연 10%)을 사용하며,
                  1주당 순손익가치가 음수인 경우 0원으로 처리합니다.
                </li>
                <li>
                  <strong>순자산가치 100% 적용 대상:</strong> 사업개시 후 3년 미만의 법인, 휴·폐업
                  법인, 청산 진행 중인 법인, 부동산비율 80% 이상 법인은 순손익가치를 고려하지 않고
                  순자산가치만으로 평가합니다.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL 1: CORPORATE TAX CALCULATOR MODAL ── */}
      {showTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-[#F37321]" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">법인세율 자동 계산기</h3>
                  <p className="text-[11px] text-slate-400">
                    2024~2026 현행 세법 누진구간 자동 적용
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTaxModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* 적용 대상 연도 선택 */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">적용 대상 사업연도</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetTaxYear('n1')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      targetTaxYear === 'n1'
                        ? 'bg-[#1E293B] text-white border-[#1E293B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {years.n1}년도
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetTaxYear('n2')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      targetTaxYear === 'n2'
                        ? 'bg-[#1E293B] text-white border-[#1E293B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {years.n2}년도
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetTaxYear('n3')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      targetTaxYear === 'n3'
                        ? 'bg-[#1E293B] text-white border-[#1E293B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {years.n3}년도
                  </button>
                </div>
              </div>

              {/* 세전이익 (과세표준) 입력 */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  세전 당기순이익 (법인세 과세표준)
                </label>
                <div>
                  <CurrencyInput
                    id="input-taxable-income"
                    value={taxableIncomeInput}
                    min={0}
                    onChange={(val) => setTaxableIncomeInput(typeof val === 'number' ? Math.max(0, val) : 0)}
                    suffix="원"
                    className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-right text-slate-800 focus:outline-none focus:border-[#F37321]"
                  />
                </div>
              </div>

              {/* 지방소득세 10% 포함 여부 */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="includeLocalTax"
                  checked={includeLocalTax}
                  onChange={(e) => setIncludeLocalTax(e.target.checked)}
                  className="rounded border-slate-300 text-[#F37321] focus:ring-[#F37321] w-4 h-4"
                />
                <label
                  htmlFor="includeLocalTax"
                  className="text-slate-700 font-medium cursor-pointer"
                >
                  지방소득세(10%) 포함 (실효세율 구간: 9.9% ~ 20.9% ~ 23.1%)
                </label>
              </div>

              {/* 계산 결과 안내 박스 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between items-center text-slate-600">
                  <span>산출 법인세액</span>
                  <span className="font-bold text-rose-600">
                    -{formatNumber(taxCalcResult.taxAmount)} 원
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>적용 실효세율</span>
                  <span className="font-bold text-slate-800">
                    {taxCalcResult.effectiveTaxRate} %
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-[#1E293B]">
                  <span>세후 순손익액</span>
                  <span className="text-base text-[#F37321]">
                    {formatNumber(taxCalcResult.netIncome)} 원
                  </span>
                </div>
                <div className="text-[10px] text-right text-slate-400 font-sans">
                  ({formatKoreanUnit(taxCalcResult.netIncome)})
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTaxModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyCalculatedNetIncome}
                className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-[#F37321] hover:bg-[#d96216] text-white transition shadow-sm cursor-pointer"
              >
                순손익액에 대입하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SAVED SIMULATIONS MODAL ── */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-[#F37321]" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    저장된 기업 시뮬레이션 목록
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    브라우저 로컬 저장소에 보관된 고객사 평가 시나리오
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {savedList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <FolderOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium">저장된 시뮬레이션이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    좌측 하단에서 명칭을 입력하고 &apos;시뮬레이션 저장&apos;을 누르세요.
                  </p>
                </div>
              ) : (
                savedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/20 transition flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                        {item.isFloorApplied && (
                          <span className="text-[10px] font-bold text-[#F37321] bg-orange-100 px-1.5 py-0.5 rounded">
                            하한선적용
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.data.companyName} | 기준일: {item.data.valuationDate} | 저장일:{' '}
                        {item.savedAt}
                      </div>
                      <div className="text-xs font-mono font-bold text-[#F37321]">
                        1주당: {formatNumber(item.finalValuePerShare)} 원 (기업가치:{' '}
                        {formatKoreanUnit(item.totalEnterpriseValue)})
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadSimulation(item)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F37321] hover:bg-[#d96216] text-white transition cursor-pointer"
                      >
                        불러오기
                      </button>
                      <button
                        onClick={() => deleteSimulation(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT & PDF EXPORT MODAL ── */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col my-auto border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-[#F37321]" />
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  비상장주식 가치평가 결과보고서 (PDF 출력 / 인쇄)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#F37321] hover:bg-[#d96216] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>인쇄 / PDF 저장 (Ctrl+P)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Guide Notice Banner */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950 flex items-start gap-2.5 shrink-0">
              <Sparkles className="w-4 h-4 text-[#F37321] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">PDF 파일 저장 안내</p>
                <p className="text-[11px] text-orange-800 mt-0.5">
                  상단 또는 하단의 <strong>[인쇄 / PDF 저장]</strong> 버튼을 누르신 후, 브라우저 인쇄 대화상자에서 대상(프린터)을 <strong>&apos;PDF로 저장&apos; (Save as PDF)</strong>으로 선택하시면 고해상도 PDF 파일로 내려받으실 수 있습니다.
                </p>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-slate-800 bg-slate-50/70 p-4 sm:p-6 rounded-xl border border-slate-200 font-sans">
              {/* Document Header */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="text-[10px] font-extrabold text-[#F37321] tracking-wider uppercase">
                    Hanwha PeopleLife Corporate Consulting
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">
                    비상장주식 시가평가 결과보고서
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    상속세 및 증여세법 제60조, 제63조 및 동법 시행령 제54조 준용
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs space-y-0.5 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded border sm:border-0 border-slate-200 w-full sm:w-auto">
                  <div><span className="font-bold text-slate-600">평가대상사:</span> <strong className="text-slate-900">{input.companyName}</strong></div>
                  <div><span className="font-bold text-slate-600">평가기준일:</span> {input.valuationDate}</div>
                  <div><span className="font-bold text-slate-600">발행주식수:</span> {formatNumber(input.totalShares)} 주</div>
                  <div><span className="font-bold text-slate-600">작성기관:</span> 한화피플라이프 대전글로리사업단</div>
                </div>
              </div>

              {/* Core KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-lg border-2 border-orange-500 shadow-2xs">
                  <div className="text-xs font-bold text-slate-500">최종 1주당 확정 평가액</div>
                  <div className="text-2xl font-black font-mono text-[#F37321] mt-1">
                    {formatNumber(calculations.finalValuePerShare)} 원
                  </div>
                  <div className="text-[11px] font-bold text-orange-700 mt-1">
                    {calculations.isFloorApplied
                      ? '★ 순자산가치 80% 하한선 규정 적용 (상증령 제54조 제2항)'
                      : '가중평균가액 정상 적용 (상증령 제54조 제1항)'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-xs font-bold text-slate-500">총 기업가치 (시가총액)</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                    {formatNumber(calculations.totalEnterpriseValue)} 원
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    {formatKoreanUnit(calculations.totalEnterpriseValue)} (자본금의 {calculations.faceMultiple.toFixed(2)}배)
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Cards */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#F37321]" />
                  <span>세부 가치평가 산출 내역</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="text-slate-500 text-[11px]">1주당 순손익가치 (3개년 가중평균)</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {formatNumber(calculations.profitValuePerShare)} 원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      가중평균 순손익 {formatNumber(calculations.weightedProfitLoss)}원 ÷ 환원율 10%
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="text-slate-500 text-[11px]">1주당 순자산가치 (자산 - 부채)</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {formatNumber(calculations.netAssetValuePerShare)} 원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      순자산 {formatNumber(calculations.netAssetValue)}원 ÷ {formatNumber(input.totalShares)}주
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="text-slate-500 text-[11px]">가중평균 평가액 (손익 3 : 자산 2)</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {formatNumber(calculations.weightedValuePerShare)} 원
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      일반 비상장법인 표준 가중비율
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50/60 rounded border border-orange-200">
                    <div className="text-orange-900 font-bold text-[11px]">순자산가치 80% 하한선</div>
                    <div className="font-black text-[#F37321] text-sm mt-0.5">
                      {formatNumber(calculations.floorValuePerShare)} 원
                    </div>
                    <div className="text-[10px] text-orange-800 mt-0.5">
                      1주당 순자산가치 × 80% (법적 최저 한도)
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Summary Table */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                <h4 className="font-bold text-xs text-slate-800 mb-2">기초 데이터 요약</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">{years.n1}년 순손익</div>
                    <div className="font-bold">{formatNumber(input.profitYear1)}원</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">{years.n2}년 순손익</div>
                    <div className="font-bold">{formatNumber(input.profitYear2)}원</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">{years.n3}년 순손익</div>
                    <div className="font-bold">{formatNumber(input.profitYear3)}원</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">순자산 (자산-부채)</div>
                    <div className="font-bold">{formatKoreanUnit(calculations.netAssetValue)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                onClick={copySummary}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? '복사 완료!' : '결과 요약 텍스트 복사'}</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-[#F37321] hover:bg-[#d96216] text-white transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>지금 인쇄 / PDF 저장</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CRETOP PDF UPLOAD & AUTO-INPUT MODAL ── */}
      <CretopUploadModal
        isOpen={showCretopModal}
        onClose={() => setShowCretopModal(false)}
        onApply={handleApplyCretopData}
      />

      {/* ── FOOTER ── */}
      <footer className="mt-auto px-6 lg:px-8 py-3 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-400 font-medium no-print">
        <div>© Hanwha PeopleLife - Daejeon Glory District Business Solution. For internal use only.</div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter text-slate-500">
          <span>Status: Active Simulation</span>
          <span className="text-emerald-600">System: Optimized</span>
        </div>
      </footer>
    </div>
  );
}
