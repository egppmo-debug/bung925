import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  Coins,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Check,
} from 'lucide-react';
import { extractTextFromPdf, parseCretopReport, ExtractedCretopData } from '../utils/cretopParser';
import { ValuationInput, formatNumber, formatKoreanUnit } from '../App';

interface CretopUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: Partial<ValuationInput>, reportMeta?: { bizNo?: string; ceo?: string }) => void;
}

// Built-in verified sample from provided KODATA (CRETOP) PDF for (주)구상케이에스씨
const SAMPLE_CRETOP_DATA: ExtractedCretopData = {
  companyName: '(주)구상케이에스씨',
  bizNumber: '305-86-29871',
  ceoName: '원재두',
  valuationDate: '2025-12-31',
  totalShares: 20000,
  faceValue: 10000,
  capitalStock: 200000000,
  years: { n1: 2025, n2: 2024, n3: 2023 },
  profitYear1: 80670000, // 2025 당기순이익 (80,670천원)
  profitYear2: 26768000, // 2024 당기순이익 (26,768천원)
  profitYear3: 46972000, // 2023 당기순이익 (46,972천원)
  totalAssets: 3089431000, // 2025 자산(*) (3,089,431천원)
  totalLiabilities: 1686694000, // 2025 부채(*) (1,686,694천원)
  confidenceNotes: [
    '기업명 확인: (주)구상케이에스씨 (사업자번호: 305-86-29871, 대표자: 원재두)',
    '평가기준일: 2025-12-31 (결산기준일)',
    '자본금 변동현황: 발행주식총수 20,000주, 1주당 액면가 10,000원 (자본금 2억원)',
    '손익계산서(표준재무제표): 최근 3개년 순손익 (2025: 8,067만원 / 2024: 2,676.8만원 / 2023: 4,697.2만원)',
    '재무상태표(표준재무제표): 자산총계 30억 8,943만원 / 부채총계 16억 8,669만원 (순자산: 14억 274만원)',
  ],
};

export function CretopUploadModal({ isOpen, onClose, onApply }: CretopUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCretopData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('PDF 파일(.pdf)만 지원합니다. 크레탑 기업정보 보고서 PDF를 선택해주세요.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');

    try {
      // 1. Extract text page by page from PDF using pdfjs
      const { pages } = await extractTextFromPdf(file);

      if (!pages || pages.length === 0 || pages.every((p) => p.trim().length === 0)) {
        throw new Error(
          'PDF에서 텍스트 레이어를 읽을 수 없습니다. 스캔된 이미지 PDF이거나 암호화된 파일일 수 있습니다.'
        );
      }

      // 2. Parse CRETOP corporate report structure
      const parsed = parseCretopReport(pages, file.name);

      // Check if anything was found
      if (!parsed.companyName && !parsed.totalAssets && !parsed.profitYear1) {
        // Fallback or notification
        parsed.confidenceNotes.push(
          '크레탑 표준 표 형식 매칭이 불완전할 수 있습니다. 추출된 값을 확인 후 적용하세요.'
        );
      }

      setExtractedData(parsed);
    } catch (err: unknown) {
      console.error('PDF parsing error:', err);
      const msg = err instanceof Error ? err.message : 'PDF 분석 중 오류가 발생했습니다.';
      setErrorMsg(
        `${msg} (우측 상단의 "구상케이에스씨 샘플 적용" 버튼으로 즉시 테스트해보실 수 있습니다.)`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    if (!extractedData) return;

    const company = (extractedData.companyName || '').trim();
    const partialInput: Partial<ValuationInput> = {};

    if (company) {
      partialInput.companyName = company;
    }

    if (extractedData.valuationDate) partialInput.valuationDate = extractedData.valuationDate;
    if (extractedData.totalShares !== undefined && extractedData.totalShares !== '') {
      partialInput.totalShares = extractedData.totalShares;
    }
    if (extractedData.faceValue !== undefined && extractedData.faceValue !== '') {
      partialInput.faceValue = extractedData.faceValue;
    }
    if (extractedData.profitYear1 !== undefined && extractedData.profitYear1 !== '') {
      partialInput.profitYear1 = extractedData.profitYear1;
    }
    if (extractedData.profitYear2 !== undefined && extractedData.profitYear2 !== '') {
      partialInput.profitYear2 = extractedData.profitYear2;
    }
    if (extractedData.profitYear3 !== undefined && extractedData.profitYear3 !== '') {
      partialInput.profitYear3 = extractedData.profitYear3;
    }
    if (extractedData.totalAssets !== undefined && extractedData.totalAssets !== '') {
      partialInput.totalAssets = extractedData.totalAssets;
    }
    if (extractedData.totalLiabilities !== undefined && extractedData.totalLiabilities !== '') {
      partialInput.totalLiabilities = extractedData.totalLiabilities;
    }

    onApply(partialInput, {
      bizNo: extractedData.bizNumber,
      ceo: extractedData.ceoName,
    });
    onClose();
  };

  const handleLoadSample = () => {
    setFileName('크레탑_기업정보보고서_구상케이에스씨.pdf');
    setFileSize('1.42 MB');
    setErrorMsg(null);
    setExtractedData({ ...SAMPLE_CRETOP_DATA });
  };

  const calculatedNetAsset =
    extractedData?.totalAssets !== undefined && extractedData?.totalLiabilities !== undefined
      ? extractedData.totalAssets - extractedData.totalLiabilities
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F37321] text-white flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">크레탑(CRETOP/KODATA) PDF 자동 입력</h3>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 font-bold px-1.5 py-0.5 rounded border border-orange-400/40">
                  전자보고서 파서
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                크레탑 또는 한국평가데이터 기업보고서 PDF를 올리시면 재무제표와 주식정보를 자동 추출합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-orange-50/70 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <FileCheck className="w-4 h-4 text-[#F37321]" />
              <span>제공된 구상케이에스씨 크레탑 PDF 샘플로 바로 테스트해보세요!</span>
            </div>
            <button
              onClick={handleLoadSample}
              className="px-3 py-1.5 bg-[#F37321] hover:bg-[#d96216] text-white font-bold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>샘플 PDF 즉시 파싱</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? 'border-[#F37321] bg-orange-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-[#F37321] hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            {isProcessing ? (
              <div className="py-4 flex flex-col items-center">
                <RefreshCw className="w-10 h-10 text-[#F37321] animate-spin mb-3" />
                <div className="font-bold text-slate-800 text-sm">크레탑 PDF 보고서 분석 중...</div>
                <div className="text-slate-500 text-[11px] mt-1">
                  재무상태표, 손익계산서 및 자본금 변동 명세를 자동 파싱하고 있습니다.
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-[#F37321] flex items-center justify-center mb-2.5">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  크레탑(CRETOP) 기업정보 PDF 파일 선택 또는 끌어놓기
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  PDF 파일을 끌어다 놓거나 클릭하여 로컬 파일을 선택하세요 (최대 50MB)
                </div>
                {fileName && (
                  <div className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#F37321]" />
                    <span>{fileName}</span>
                    <span className="text-slate-400 text-[10px]">({fileSize})</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Extracted Data Preview Section */}
          {extractedData && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>추출된 기업 및 재무 데이터 검토</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  파싱 완료
                </span>
              </div>

              {/* Company & Stock Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="col-span-1">
                  <label className="text-[11px] text-slate-700 font-bold flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#F37321]" />
                      <span>회사명</span>
                      <span className="text-orange-500 font-bold">*</span>
                    </span>
                    {extractedData.ceoName && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        대표: {extractedData.ceoName}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={extractedData.companyName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExtractedData((prev) => (prev ? { ...prev, companyName: val } : null));
                    }}
                    placeholder="회사명 (예: (주)동산기획)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#F37321] focus:border-[#F37321] outline-none shadow-xs"
                  />
                  {extractedData.bizNumber && (
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      사업자번호: {extractedData.bizNumber}
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] text-slate-700 font-bold flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>평가기준일 (결산일)</span>
                  </label>
                  <input
                    type="date"
                    value={extractedData.valuationDate || '2025-12-31'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExtractedData((prev) => (prev ? { ...prev, valuationDate: val } : null));
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#F37321] focus:border-[#F37321] outline-none shadow-xs"
                  />
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>발행주식총수</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {formatNumber(extractedData.totalShares)} 주
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    <span>1주당 액면가액</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {formatNumber(extractedData.faceValue)} 원
                  </div>
                </div>
              </div>

              {/* Profit & Balance Sheet Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 3 Years Profits */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1">
                    최근 3개년 순손익 (손익계산서)
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">1년전 (n-1):</span>
                      <span className="font-bold text-slate-900">
                        {formatNumber(extractedData.profitYear1)}원{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({formatKoreanUnit(extractedData.profitYear1)})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">2년전 (n-2):</span>
                      <span className="font-bold text-slate-900">
                        {formatNumber(extractedData.profitYear2)}원{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({formatKoreanUnit(extractedData.profitYear2)})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">3년전 (n-3):</span>
                      <span className="font-bold text-slate-900">
                        {formatNumber(extractedData.profitYear3)}원{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({formatKoreanUnit(extractedData.profitYear3)})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balance Sheet Assets/Liabilities */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1">
                    자산 및 부채 (재무상태표)
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">자산총계:</span>
                      <span className="font-bold text-slate-900">
                        {formatNumber(extractedData.totalAssets)}원{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({formatKoreanUnit(extractedData.totalAssets)})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">부채총계:</span>
                      <span className="font-bold text-slate-900">
                        {formatNumber(extractedData.totalLiabilities)}원{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({formatKoreanUnit(extractedData.totalLiabilities)})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 text-orange-700">
                      <span className="font-semibold">순자산가액:</span>
                      <span className="font-bold">
                        {formatNumber(calculatedNetAsset)}원{' '}
                        <span className="text-[10px] font-normal">
                          ({formatKoreanUnit(calculatedNetAsset)})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence Details Log */}
              {extractedData.confidenceNotes.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-700 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>파싱 상세 내역:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                    {extractedData.confidenceNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            닫기
          </button>
          <button
            disabled={!extractedData || isProcessing}
            onClick={handleApply}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#F37321] hover:bg-[#d96216] disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>평가 입력란에 자동 반영</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
