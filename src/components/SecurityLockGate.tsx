import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle, Delete, Check } from 'lucide-react';
import {
  verifyPassword,
  setAuthenticated,
  getStoredPassword,
  DEFAULT_PASSCODE,
  subscribeToSecuritySettings,
} from '../utils/security';

interface SecurityLockGateProps {
  onUnlock: () => void;
}

export const SecurityLockGate: React.FC<SecurityLockGateProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState(getStoredPassword());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input automatically on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Subscribe to cloud updates in real-time
    const unsubscribe = subscribeToSecuritySettings((data) => {
      setCurrentPasscode(data.userPasscode);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode) {
      setErrorMsg('비밀번호를 입력해 주세요.');
      triggerShake();
      return;
    }

    if (verifyPassword(passcode)) {
      setErrorMsg(null);
      setIsSuccess(true);
      setAuthenticated(rememberMe);
      setTimeout(() => {
        onUnlock();
      }, 400);
    } else {
      setErrorMsg('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      triggerShake();
      setPasscode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeypadPress = (digit: string) => {
    setErrorMsg(null);
    if (passcode.length < 20) {
      setPasscode((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPasscode((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg(null);
    setPasscode('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isDefaultPasswordStillActive = currentPasscode === DEFAULT_PASSCODE;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Brand Bar */}
      <header className="w-full max-w-md mx-auto pt-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
        <ShieldCheck className="w-4 h-4 text-[#F37321]" />
        <span className="font-semibold tracking-wider text-[11px] uppercase">
          Hanwha PeopleLife Corporate Consulting Security
        </span>
      </header>

      {/* Main Lock Container */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div
          className={`bg-slate-800/95 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm transition-transform duration-200 ${
            isShaking ? 'translate-x-2' : ''
          }`}
          style={{
            animation: isShaking ? 'shake 0.4s ease-in-out' : undefined,
          }}
        >
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#F37321] p-1.5 shadow-lg shadow-orange-500/20 flex items-center justify-center mb-3">
              <img
                src="/logo.svg"
                alt="한화 로고"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h1 className="text-lg font-black text-white tracking-tight">
                한화피플라이프
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-[#F37321] border border-orange-500/40">
                대전글로리사업단
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-300">
              비상장주식 시가평가 솔루션
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              본 시스템은 사업단 내부 전용 솔루션입니다.<br />
              접근을 위해 보안 비밀번호(PIN)를 입력해 주세요.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>보안 비밀번호</span>
                <span className="text-[10px] text-slate-400">숫자 또는 문자 입력 가능</span>
              </label>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <KeyRound className="w-4 h-4 text-[#F37321]" />
                </div>
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setPasscode(e.target.value);
                  }}
                  placeholder="비밀번호 입력"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl py-3 pl-10 pr-11 text-white text-base tracking-wider font-mono placeholder:text-slate-500 placeholder:font-sans placeholder:text-xs focus:outline-none focus:border-[#F37321] focus:ring-2 focus:ring-[#F37321]/30 transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Smartphone Friendly Virtual Keypad */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                <span>간편 터치 키패드 (스마트폰용)</span>
                {passcode.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[10px] text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    전체 지우기
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:bg-orange-500/20 active:border-orange-500 text-white font-mono font-bold text-lg border border-slate-600/60 transition shadow-xs cursor-pointer select-none active:scale-95 flex items-center justify-center"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  취소(C)
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:bg-orange-500/20 active:border-orange-500 text-white font-mono font-bold text-lg border border-slate-600/60 transition shadow-xs cursor-pointer select-none active:scale-95 flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#F37321] focus:ring-[#F37321] focus:ring-offset-slate-800 bg-slate-900 border-slate-600 accent-[#F37321]"
                />
                <span>이 기기에서 로그인 유지 (자동 접속)</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSuccess}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                isSuccess
                  ? 'bg-emerald-600 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-orange-500/25'
              }`}
            >
              {isSuccess ? (
                <>
                  <Check className="w-5 h-5 animate-scaleIn" />
                  <span>인증 성공! 접속 중...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>솔루션 잠금 해제</span>
                </>
              )}
            </button>
          </form>

          {/* Initial Password Notice */}
          {isDefaultPasswordStillActive && (
            <div className="mt-5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-300/90 leading-relaxed text-center">
              <span className="font-bold text-orange-400">※ 초기 접속 비밀번호 안내: </span>
              <code className="px-1.5 py-0.5 bg-slate-900 rounded font-mono font-bold text-[#F37321] border border-orange-500/40">
                0000
              </code>
              <br />
              <span className="text-[10px] text-slate-400">
                (비밀번호 변경 및 보안 관리는 관리자 전용 메뉴에서 가능합니다.)
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto pb-4 text-center text-[11px] text-slate-500">
        © Hanwha PeopleLife Daejeon Glory. Authorized Personnel Only.
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};
