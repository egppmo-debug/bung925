import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleClearCacheAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cache clearing error:', e);
    }
    window.location.reload();
  };

  private handleFullReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await this.handleClearCacheAndReload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center text-[#F37321] mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-[11px] font-extrabold text-[#F37321] uppercase tracking-wider mb-1">
              한화피플라이프 대전글로리사업단
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">
              화면 표시 오류 복구 안내
            </h1>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              모바일 기기의 이전 캐시 데이터 또는 호환성 문제로 화면이 정상적으로 로드되지 않았습니다.
              아래 버튼을 누르면 캐시를 정리하고 최신 상태로 즉시 다시 시작합니다.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-3 px-4 rounded-xl bg-[#F37321] hover:bg-[#d96216] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>캐시 초기화 및 새로고침</span>
              </button>

              <button
                type="button"
                onClick={this.handleFullReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>저장 데이터 완전 초기화 후 다시 시작</span>
              </button>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left border-t border-slate-100 pt-3">
                <summary className="text-[10px] text-slate-400 cursor-pointer font-mono hover:text-slate-600">
                  기술 오류 세부내용 확인
                </summary>
                <pre className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-red-600 font-mono overflow-x-auto whitespace-pre-wrap max-h-32 border border-slate-200">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
