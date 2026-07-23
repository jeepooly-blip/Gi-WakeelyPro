import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Scan,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Smartphone,
  Sparkles,
  KeyRound,
  AlertCircle,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import {
  getBiometricSettings,
  saveBiometricSettings,
  checkBiometricSupport,
  registerBiometricCredential,
  verifyBiometricIdentity,
  BiometricState,
  BiometricCredential
} from '../lib/biometricAuth';

interface BiometricAuthModalProps {
  isOpen: boolean;
  mode: 'verify' | 'settings';
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export default function BiometricAuthModal({
  isOpen,
  mode,
  onClose,
  onSuccess,
  title,
  subtitle
}: BiometricAuthModalProps) {
  const { isRtl, language } = useLanguage();
  const [settings, setSettings] = useState<BiometricState>(getBiometricSettings());
  const [supportInfo, setSupportInfo] = useState<{
    supported: boolean;
    platformAuthenticatorAvailable: boolean;
    type: 'FaceID' | 'TouchID' | 'Passkey' | 'Biometric';
  }>({ supported: true, platformAuthenticatorAvailable: true, type: 'FaceID' });

  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getBiometricSettings());
      checkBiometricSupport().then(setSupportInfo);
      setScanning(false);
      setScanSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanBiometrics = async () => {
    setScanning(true);
    setErrorMessage(null);

    // Provide visual scanning animation duration for realistic mobile feel
    setTimeout(async () => {
      const res = await verifyBiometricIdentity();
      setScanning(false);
      if (res.success) {
        setScanSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error || (isRtl ? 'فشلت البصمة، يرجى المحاولة مرة أخرى' : 'Biometric verification failed. Please try again.'));
      }
    }, 1200);
  };

  const handleToggleBiometric = async (enable: boolean) => {
    if (enable) {
      setScanning(true);
      setErrorMessage(null);
      const res = await registerBiometricCredential(isRtl ? 'المحامي المعتمد' : 'Lead Attorney');
      setScanning(false);

      if (res.success) {
        setScanSuccess(true);
        setSettings(getBiometricSettings());
        setTimeout(() => setScanSuccess(false), 2000);
      } else {
        setErrorMessage(res.error || (isRtl ? 'تعذر تفعيل البصمة' : 'Could not enable biometric auth'));
      }
    } else {
      const updated = { ...settings, enabled: false };
      saveBiometricSettings(updated);
      setSettings(updated);
    }
  };

  const handleRemoveCredential = (id: string) => {
    const updated = {
      ...settings,
      credentials: settings.credentials.filter((c) => c.id !== id),
      enabled: settings.credentials.length > 1 ? settings.enabled : false,
    };
    saveBiometricSettings(updated);
    setSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-slate-100 shadow-2xl relative overflow-hidden font-sans">
        
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-amber-400 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'verify' ? (
          /* ================= VERIFICATION LOCK SCREEN ================= */
          <div className="flex flex-col items-center text-center py-4 space-y-6">
            
            {/* Shield Icon Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isRtl ? 'المصادقة البيومترية المشفرة' : 'Encrypted Biometric Auth'}</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white font-display">
                {title || (isRtl ? 'تأكيد الهوية ببصمة الوجه / الأصبع' : 'Biometric Security Verification')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xs mx-auto">
                {subtitle ||
                  (isRtl
                    ? 'يرجى تأكيد هويتك باستخدام البصمة للوصول الآمن إلى القضايا والمستندات السرية'
                    : 'Use Face ID, Touch ID, or fingerprint scanner to unlock confidential case files')}
              </p>
            </div>

            {/* Biometric Scanning Visual Target */}
            <div className="relative my-4 flex items-center justify-center">
              
              {/* Outer Pulse Rings */}
              <div
                className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  scanSuccess
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/30'
                    : scanning
                    ? 'border-indigo-400 bg-indigo-500/10 animate-pulse shadow-lg shadow-indigo-500/30'
                    : 'border-indigo-500/30 bg-slate-800/50 hover:border-indigo-500/60'
                }`}
              >
                {/* Laser Scanning Bar */}
                {scanning && (
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce top-1/2" />
                )}

                {scanSuccess ? (
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-in zoom-in-50 duration-300" />
                ) : supportInfo.type === 'FaceID' ? (
                  <Scan className={`w-16 h-16 ${scanning ? 'text-indigo-400' : 'text-slate-300'}`} />
                ) : (
                  <Fingerprint className={`w-16 h-16 ${scanning ? 'text-indigo-400' : 'text-slate-300'}`} />
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold w-full justify-center">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Scan Action Button */}
            <button
              onClick={handleScanBiometrics}
              disabled={scanning || scanSuccess}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>{isRtl ? 'جاري مسح البصمة...' : 'Scanning Biometrics...'}</span>
                </>
              ) : scanSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isRtl ? 'تم التحقق بنجاح!' : 'Identity Verified!'}</span>
                </>
              ) : (
                <>
                  {supportInfo.type === 'FaceID' ? (
                    <Scan className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Fingerprint className="w-4 h-4 text-amber-300" />
                  )}
                  <span>
                    {isRtl
                      ? `مسح ${supportInfo.type === 'FaceID' ? 'بصمة الوجه (Face ID)' : 'بصمة الاصبع'}`
                      : `Scan ${supportInfo.type === 'FaceID' ? 'Face ID' : 'Fingerprint'}`}
                  </span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 font-medium">
              {isRtl
                ? 'متوافق مع معيار الأمان العالي W3C WebAuthn والمحفظة البيومترية'
                : 'Secured via standard WebAuthn API hardware platform authenticator'}
            </p>
          </div>
        ) : (
          /* ================= BIOMETRIC MANAGEMENT SETTINGS ================= */
          <div className="space-y-6 pt-2">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white font-display">
                  {isRtl ? 'إعدادات الحماية البيومترية' : 'Biometric Security Settings'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {isRtl ? 'بصمة الوجه واليد للوصول السريع إلى القضايا' : 'Face ID & Touch ID Mobile Access'}
                </p>
              </div>
            </div>

            {/* Enable/Disable Main Switch */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    settings.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.enabled ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white">
                    {isRtl ? 'تأمين الملفات بالبصمة' : 'Require Biometrics'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isRtl ? 'قفل التطبيق وتأكيده عبر الوجه/الاصبع' : 'Lock sensitive app features with Face ID'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggleBiometric(!settings.enabled)}
                disabled={scanning}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.enabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.enabled ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Registered Devices List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {isRtl ? 'الأجهزة والأوسمة المسجلة' : 'Registered Devices & Passkeys'}
                </span>
                <button
                  onClick={() => handleScanBiometrics()}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'اختبار المسح' : 'Test Scanner'}</span>
                </button>
              </div>

              {settings.credentials.length === 0 ? (
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 text-center space-y-2">
                  <Smartphone className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">
                    {isRtl ? 'لا يوجد جهاز بصمة مسجل حالياً' : 'No biometric devices registered yet.'}
                  </p>
                  <button
                    onClick={() => handleToggleBiometric(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {isRtl ? '+ تسجيل بصمة هذا الجهاز' : '+ Register Device'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {settings.credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                          {cred.type === 'FaceID' ? <Scan className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{cred.deviceName}</div>
                          <div className="text-[10px] text-slate-400">
                            {isRtl ? 'مسجل في:' : 'Registered:'} {new Date(cred.registeredAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveCredential(cred.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title={isRtl ? 'حذف الجهاز' : 'Remove credential'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-Lock Settings */}
            <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{isRtl ? 'مدة القفل التلقائي:' : 'Auto-lock timer:'}</span>
              </div>
              <select
                value={settings.autoLockMinutes}
                onChange={(e) => {
                  const updated = { ...settings, autoLockMinutes: Number(e.target.value) };
                  saveBiometricSettings(updated);
                  setSettings(updated);
                }}
                className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
              >
                <option value={1}>{isRtl ? 'دقيقة واحدة' : '1 minute'}</option>
                <option value={5}>{isRtl ? '5 دقائق' : '5 minutes'}</option>
                <option value={15}>{isRtl ? '15 دقيقة' : '15 minutes'}</option>
                <option value={60}>{isRtl ? 'ساعة واحدة' : '1 hour'}</option>
              </select>
            </div>

            {/* Save / Close */}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {isRtl ? 'حفظ وإغلاق' : 'Save & Close'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
