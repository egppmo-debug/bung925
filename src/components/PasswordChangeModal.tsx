import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Check,
  X,
  Shield,
  ShieldCheck,
  AlertCircle,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  Cloud,
  Loader2,
} from 'lucide-react';
import {
  getStoredUserPassword,
  getStoredAdminPassword,
  saveNewUserPassword,
  saveNewAdminPassword,
  verifyAdminPassword,
  clearAuthentication,
  subscribeToSecuritySettings,
} from '../utils/security';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onSuccessToast: (msg: string) => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  onSuccessToast,
}) => {
  // Step 1: Admin Gate Verification (Admin PIN required to configure security)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminGateError, setAdminGateError] = useState<string | null>(null);

  // Tab: 'user_pass' (일반 사용자/FA 비밀번호 관리) vs 'admin_pass' (관리자 PIN 관리)
  const [activeTab, setActiveTab] = useState<'user_pass' | 'admin_pass'>('user_pass');

  // Fields for changing User Password
  const [newUserPass, setNewUserPass] = useState('');
  const [confirmUserPass, setConfirmUserPass] = useState('');
  const [showNewUserPass, setShowNewUserPass] = useState(false);

  // Fields for changing Admin Password
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time current display values
  const [currentUserPassword, setCurrentUserPassword] = useState(getStoredUserPassword());
  const [currentAdminPassword, setCurrentAdminPassword] = useState(getStoredAdminPassword());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Sync with Firestore when modal is open
  useEffect(() => {
    if (!isOpen) return;

    setCurrentUserPassword(getStoredUserPassword());
    setCurrentAdminPassword(getStoredAdminPassword());

    const unsubscribe = subscribeToSecuritySettings((data) => {
      setCurrentUserPassword(data.userPasscode);
      setCurrentAdminPassword(data.adminPasscode);
      if (data.updatedAt) {
        setLastSyncTime(new Date(data.updatedAt).toLocaleTimeString('ko-KR'));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Admin Authorization Gate
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminGateError(null);

    if (!adminPinInput) {
      setAdminGateError('관리자 비밀번호를 입력해 주세요.');
      return;
    }

    if (verifyAdminPassword(adminPinInput)) {
      setIsAdminUnlocked(true);
      setAdminGateError(null);
      setAdminPinInput('');
    } else {
      setAdminGateError('관리자 전용 비밀번호가 일치하지 않습니다. 관리자 권한이 있는 분만 변경할 수 있습니다.');
    }
  };

  // Handle Updating User (FA) Passcode
  const handleSaveUserPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newUserPass || newUserPass.trim().length < 4) {
      setFormError('사용자 비밀번호는 4자리 이상으로 입력해 주세요.');
      return;
    }

    if (newUserPass !== confirmUserPass) {
      setFormError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setIsSaving(true);
      const ok = await saveNewUserPassword(newUserPass);
      if (ok) {
        onSuccessToast(`✓ 사용자(FA) 접속 비밀번호가 '${newUserPass.trim()}'(으)로 중앙 클라우드에 일괄 동기화되었습니다.`);
        setNewUserPass('');
        setConfirmUserPass('');
        handleClose();
      } else {
        setFormError('비밀번호 저장 중 오류가 발생했습니다.');
      }
    } catch {
      setFormError('클라우드 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Updating Admin Passcode
  const handleSaveAdminPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!verifyAdminPassword(currentAdminPass)) {
      setFormError('현재 관리자 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!newAdminPass || newAdminPass.trim().length < 4) {
      setFormError('새 관리자 비밀번호는 4자리 이상이어야 합니다.');
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setFormError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setIsSaving(true);
      const ok = await saveNewAdminPassword(newAdminPass);
      if (ok) {
        onSuccessToast('✓ 관리자 전용 비밀번호가 성공적으로 변경 및 클라우드 동기화되었습니다.');
        setCurrentAdminPass('');
        setNewAdminPass('');
        setConfirmAdminPass('');
        handleClose();
      } else {
        setFormError('관리자 비밀번호 저장 중 오류가 발생했습니다.');
      }
    } catch {
      setFormError('클라우드 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsAdminUnlocked(false);
    setAdminPinInput('');
    setAdminGateError(null);
    setFormError(null);
    onClose();
  };

  const handleManualLock = () => {
    clearAuthentication();
    handleClose();
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base text-white">관리자 보안 통제 센터</h3>
                <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/30">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>한화피플라이프 대전글로리사업단</span>
                <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-0.5">
                  <Cloud className="w-3 h-3 inline" /> 클라우드 실시간 동기화
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!isAdminUnlocked ? (
            /* ── STEP 1: ADMIN PASSCODE GATE ── */
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>관리자 인증 필요</span>
                </div>
                <p>
                  접속 비밀번호 설정 및 솔루션 보안 관리는 <strong>사업단 관리자</strong>만 수행할 수 있습니다. 계속하려면 관리자 비밀번호를 입력하세요.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  관리자 비밀번호
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showAdminPin ? 'text' : 'password'}
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminGateError(null);
                      setAdminPinInput(e.target.value);
                    }}
                    placeholder="관리자 비밀번호 입력"
                    autoFocus
                    className="w-full text-sm p-3 pr-10 border border-slate-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {adminGateError && (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{adminGateError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4 text-[#F37321]" />
                  <span>관리자 승인 및 설정 열기</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">화면 즉시 잠금만 필요하신가요?</span>
                <button
                  type="button"
                  onClick={handleManualLock}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>지금 잠그기</span>
                </button>
              </div>
            </form>
          ) : (
            /* ── STEP 2: ADMIN CONTROL PANEL (MANAGEMENT) ── */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('user_pass');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'user_pass'
                      ? 'bg-white text-[#F37321] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>사용자(FA) 비밀번호</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin_pass');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'admin_pass'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>관리자 비밀번호</span>
                </button>
              </div>

              {/* TAB 1: USER (FA) PASSWORD SETTING */}
              {activeTab === 'user_pass' && (
                <form onSubmit={handleSaveUserPasscode} className="space-y-3.5">
                  <div className="p-3 bg-orange-50/80 rounded-xl border border-orange-200/80 text-xs text-orange-950">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-orange-900">현재 클라우드 적용 비밀번호</span>
                      <code className="px-2 py-0.5 bg-white rounded font-mono font-bold text-[#F37321] border border-orange-200 text-xs shadow-2xs">
                        {currentUserPassword}
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      여기서 비밀번호를 변경하면 <strong>모든 소속 FA 스마트폰/PC에 실시간으로 즉시 일괄 반영</strong>됩니다.
                    </p>
                    {lastSyncTime && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        최근 클라우드 동기화: {lastSyncTime}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      새 사용자 비밀번호 (4자리 이상 숫자/영문)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showNewUserPass ? 'text' : 'password'}
                        value={newUserPass}
                        onChange={(e) => {
                          setFormError(null);
                          setNewUserPass(e.target.value);
                        }}
                        placeholder="예: 1234 또는 사업단 지정번호"
                        className="w-full text-xs p-2.5 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F37321] focus:ring-1 focus:ring-[#F37321]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPass(!showNewUserPass)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showNewUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      새 비밀번호 재입력 확인
                    </label>
                    <input
                      type={showNewUserPass ? 'text' : 'password'}
                      value={confirmUserPass}
                      onChange={(e) => {
                        setFormError(null);
                        setConfirmUserPass(e.target.value);
                      }}
                      placeholder="새 비밀번호 다시 입력"
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#F37321] focus:ring-1 focus:ring-[#F37321]"
                    />
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 bg-[#F37321] hover:bg-[#d96216] disabled:bg-orange-300 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>클라우드 서버에 동기화 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>전체 단말기 일괄 적용 및 클라우드 저장</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: ADMIN PASSWORD SETTING */}
              {activeTab === 'admin_pass' && (
                <form onSubmit={handleSaveAdminPasscode} className="space-y-3.5">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-950">
                    <p className="font-semibold leading-relaxed">
                      관리자 전용 비밀번호는 일반 사용자에게 공개되지 않는 마스터 비밀번호입니다. 변경 시 클라우드 서버에 안전하게 암호화 보관됩니다.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      현재 관리자 비밀번호
                    </label>
                    <input
                      type="password"
                      value={currentAdminPass}
                      onChange={(e) => {
                        setFormError(null);
                        setCurrentAdminPass(e.target.value);
                      }}
                      placeholder="현재 관리자 비밀번호 입력"
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      새 관리자 비밀번호 (4자리 이상)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showNewAdminPass ? 'text' : 'password'}
                        value={newAdminPass}
                        onChange={(e) => {
                          setFormError(null);
                          setNewAdminPass(e.target.value);
                        }}
                        placeholder="새 관리자 비밀번호 입력"
                        className="w-full text-xs p-2.5 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewAdminPass(!showNewAdminPass)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showNewAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      새 관리자 비밀번호 재입력 확인
                    </label>
                    <input
                      type={showNewAdminPass ? 'text' : 'password'}
                      value={confirmAdminPass}
                      onChange={(e) => {
                        setFormError(null);
                        setConfirmAdminPass(e.target.value);
                      }}
                      placeholder="새 관리자 비밀번호 다시 입력"
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>관리자 비밀번호 동기화 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>새 관리자 비밀번호로 변경 및 동기화</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Bottom Quick Lock */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">작업 완료 후 화면 즉시 잠금</span>
                <button
                  type="button"
                  onClick={handleManualLock}
                  className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>지금 잠그기 (로그아웃)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
