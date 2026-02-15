import React, { useState } from "react";
import { mc } from "@/lib/microcopy";
import { useAuth } from "@/contexts/AuthContext";

type Step = "choose" | "email" | "code";

interface AuthDrawerProps {
  onClose?: () => void;
}

export const AuthDrawer: React.FC<AuthDrawerProps> = ({ onClose }) => {
  const { signInWithGoogle, sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await sendOTP(email.trim());
    setLoading(false);
    if (!error) setStep("code");
  };

  const handleVerify = async () => {
    if (!email.trim() || !code.trim()) return;
    setLoading(true);
    const { error } = await verifyOTP(email.trim(), code.trim());
    setLoading(false);
    if (!error && onClose) onClose();
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black/80 backdrop-blur-sm rounded-[var(--sw-radius-panel)] p-6">
      <div className="flex flex-col items-center justify-center flex-1 max-w-[280px] mx-auto">
        <h3 className="text-sm font-medium text-white/90 mb-1 text-center">
          {mc.workspace.empty.notLoggedIn.title}
        </h3>
        <p className="text-xs text-white/50 mb-6 text-center">
          {mc.workspace.empty.notLoggedIn.body}
        </p>

        {step === "choose" && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-[var(--sw-radius-panel)] bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/10 mb-3 transition-colors disabled:opacity-50"
            >
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full px-4 py-2.5 rounded-[var(--sw-radius-panel)] bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/10 transition-colors"
            >
              Continue with Email
            </button>
          </>
        )}

        {step === "email" && (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-[var(--sw-radius-panel)] bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 mb-3 focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)]"
            />
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="px-4 py-2 rounded-[var(--sw-radius-panel)] text-white/70 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50"
              >
                Send code
              </button>
            </div>
          </>
        )}

        {step === "code" && (
          <>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-3 py-2 rounded-[var(--sw-radius-panel)] bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 mb-3 text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)]"
            />
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); }}
                className="px-4 py-2 rounded-[var(--sw-radius-panel)] text-white/70 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || code.length < 6}
                className="flex-1 px-4 py-2 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
