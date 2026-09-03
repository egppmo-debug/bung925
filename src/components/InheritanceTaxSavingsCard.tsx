import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { PiggyBank, TrendingDown, Percent, Info, Sparkles } from 'lucide-react';
import { formatNumber, formatKoreanUnit } from '../App';

interface InheritanceTaxSavingsCardProps {
  totalEnterpriseValue: number;
  companyName?: string;
}

const TAX_RATE_BRACKETS = [
  { rate: 10, label: '10%', desc: '1억 이하 구간', color: '#60A5FA' },
  { rate: 20, label: '20%', desc: '1억~5억 구간', color: '#34D399' },
  { rate: 30, label: '30%', desc: '5억~10억 구간', color: '#FBBF24' },
  { rate: 40, label: '40%', desc: '10억~30억 구간', color: '#FB923C' },
  { rate: 50, label: '50%', desc: '30억 초과 최고세율', color: '#F37321' },
];

export const InheritanceTaxSavingsCard: React.FC<InheritanceTaxSavingsCardProps> = ({
  totalEnterpriseValue,
  companyName,
}) => {
  // Reduction rate of taxable value through planning (e.g. 10%, 20%, 30%, default 20%)
  const [reductionRate, setReductionRate] = useState<number>(20);
  // Equity ratio considered for succession (e.g. 100%, 70%, 50%, default 100%)
  const [shareRatio, setShareRatio] = useState<number>(100);
  // View mode: 'savings' (절세액 집중) vs 'comparison' (플랜 전/후 비교)
  const [viewMode, setViewMode] = useState<'savings' | 'comparison'>('savings');

  // Effective taxable enterprise equity value
  const targetValue = useMemo(() => {
    return Math.max(0, Math.round(totalEnterpriseValue * (shareRatio / 100)));
  }, [totalEnterpriseValue, shareRatio]);

  // Reduced amount by corporate planning
  const reducedValue = useMemo(() => {
    return Math.max(0, Math.round(targetValue * (reductionRate / 100)));
  }, [targetValue, reductionRate]);

  // Chart data for hypothetical base tax rates (10% ~ 50%)
  const chartData = useMemo(() => {
    return TAX_RATE_BRACKETS.map((bracket) => {
      const taxRate = bracket.rate / 100;
      // Pre-planning estimated tax
      const beforeTax = Math.round(targetValue * taxRate);
      // Tax savings amount = reduced valuation * tax rate
      const taxSavings = Math.round(reducedValue * taxRate);
      // Post-planning estimated tax
      const afterTax = Math.max(0, beforeTax - taxSavings);

      return {
        bracket: `${bracket.rate}%`,
        rateLabel: bracket.label,
        desc: bracket.desc,
        rate: bracket.rate,
        beforeTax,
        afterTax,
        taxSavings,
        // formatted in 억/만원 for readable tooltips
        beforeTaxStr: formatKoreanUnit(beforeTax),
        afterTaxStr: formatKoreanUnit(afterTax),
        taxSavingsStr: formatKoreanUnit(taxSavings),
        taxSavingsMan: Math.round(taxSavings / 10000), // in 10,000 KRW
      };
    });
  }, [targetValue, reducedValue]);

  // Max savings at top 50% bracket
  const maxSavings = useMemo(() => {
    return Math.round(reducedValue * 0.5);
  }, [reducedValue]);

  // Identify applicable statutory bracket for targetValue
  const applicableStatutoryRate = useMemo(() => {
    if (targetValue === 0) return '데이터 입력 대기';
    if (targetValue > 3000000000) return '50% (30억 초과 최고세율)';
    if (targetValue > 1000000000) return '40% (10억~30억 구간)';
    if (targetValue > 500000000) return '30% (5억~10억 구간)';
    if (targetValue > 100000000) return '20% (1억~5억 구간)';
    return '10% (1억 이하 구간)';
  }, [targetValue]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 print:break-inside-avoid">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F37321]">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                상속세 절세 예상액 시뮬레이션
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F37321]/10 text-[#F37321] border border-[#F37321]/20">
                기본세율 10~50% 적용
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              가업승계 주가 관리(사전 증여·잉여금 처분)에 따른 구간별 상속세 절감 효과
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold no-print">
          <button
            onClick={() => setViewMode('savings')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              viewMode === 'savings'
                ? 'bg-white text-[#F37321] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            절세 예상액 중심
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              viewMode === 'comparison'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전·후 상속세 비교
          </button>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
        {/* Control 1: Reduction Rate */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-[#F37321]" />
              주가/과세가액 예상 절감률:
            </span>
            <span className="font-mono font-bold text-[#F37321] text-xs">
              {reductionRate}% 절감 ({formatKoreanUnit(reducedValue)})
            </span>
          </div>
          <div className="flex gap-1.5">
            {[10, 20, 30, 40].map((rate) => (
              <button
                key={rate}
                onClick={() => setReductionRate(rate)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                  reductionRate === rate
                    ? 'bg-[#F37321] text-white border-[#F37321] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#F37321]/50 hover:bg-orange-50/30'
                }`}
              >
                {rate}% {rate === 20 && '(표준)'}
              </button>
            ))}
          </div>
        </div>

        {/* Control 2: Target Equity Share */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-blue-500" />
              승계 대상 지분율:
            </span>
            <span className="font-mono font-bold text-slate-700 text-xs">
              {shareRatio}% ({formatKoreanUnit(targetValue)})
            </span>
          </div>
          <div className="flex gap-1.5">
            {[100, 80, 50, 30].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setShareRatio(ratio)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                  shareRatio === ratio
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {ratio}% {ratio === 100 && '(전체)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full h-64 sm:h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="bracket"
              tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
              dy={5}
            />
            <YAxis
              tickFormatter={(value) => {
                if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
                if (value >= 10000) return `${Math.round(value / 10000)}만`;
                return `${value}`;
              }}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-bold">
                        <span className="text-amber-400">가상 기본세율 {data.rateLabel}</span>
                        <span className="text-[10px] text-slate-400">({data.desc})</span>
                      </div>
                      <div className="space-y-1 pt-1 text-[11px]">
                        <div className="flex justify-between text-slate-300">
                          <span>플랜 전 예상 상속세:</span>
                          <span className="font-mono text-slate-200">{data.beforeTaxStr}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>플랜 후 예상 상속세:</span>
                          <span className="font-mono text-slate-300">{data.afterTaxStr}</span>
                        </div>
                        <div className="flex justify-between font-bold text-[#F37321] pt-1 border-t border-slate-800">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#F37321]" />
                            예상 절세액 ({reductionRate}% 플랜):
                          </span>
                          <span className="font-mono text-amber-300 text-xs">{data.taxSavingsStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
            />

            {viewMode === 'savings' ? (
              <Bar
                dataKey="taxSavings"
                name="상속세 절세 예상액 (원)"
                fill="#F37321"
                radius={[6, 6, 0, 0]}
                barSize={36}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.rate === 50 ? '#F37321' : entry.rate === 40 ? '#FB923C' : '#FDBA74'}
                  />
                ))}
              </Bar>
            ) : (
              <>
                <Bar
                  dataKey="beforeTax"
                  name="플랜 적용 전 예상 상속세"
                  fill="#94A3B8"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="afterTax"
                  name="플랜 적용 후 예상 상속세"
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="taxSavings"
                  name="절세 예상액"
                  fill="#F37321"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Summary Strip */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
          <div className="text-[11px] text-orange-800 font-medium">최고세율(50%) 기준 최대 절세액</div>
          <div className="text-sm font-black font-mono text-[#F37321] mt-0.5">
            {formatKoreanUnit(maxSavings)}
          </div>
          <div className="text-[10px] text-orange-600 mt-0.5">주가 {reductionRate}% 조정 시</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-600 font-medium">중간세율(30%) 기준 절세액</div>
          <div className="text-sm font-black font-mono text-slate-800 mt-0.5">
            {formatKoreanUnit(Math.round(reducedValue * 0.3))}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">5억~10억 기본세율 구간</div>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-[11px] text-blue-800 font-medium">기업가치 기준 추정 해당 구간</div>
          <div className="text-xs font-bold text-blue-900 mt-1 truncate">
            {applicableStatutoryRate}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            대상 가액: {formatKoreanUnit(targetValue)}
          </div>
        </div>
      </div>

      {/* Consultant Guidance Note */}
      <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
        <Info className="w-4 h-4 text-[#F37321] shrink-0 mt-0.5" />
        <span>
          ※ 본 차트는 고객 이해를 돕기 위해 상증세법상 5단계 법정 기본세율(10%~50%)을 단순 적용한 가상
          시뮬레이션입니다. 실제 상속세 산출 시에는 상속인 구성별 일괄공제(기본 5억~10억원), 배우자공제, 가업상속공제 및
          누진공제액이 함께 반영됩니다.
        </span>
      </div>
    </div>
  );
};
