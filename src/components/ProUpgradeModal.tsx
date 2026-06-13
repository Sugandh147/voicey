"use client";

import React, { useState, useRef } from "react";
import {
  Zap,
  X,
  Check,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  ArrowRight,
  Loader2,
  AudioLines,
  Sparkles,
  Infinity as InfinityIcon,
  Shield,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onRealCheckout?: () => void;
  isCheckoutPending?: boolean;
}

type PaymentMethod = "upi" | "card" | "netbanking";
type ModalStep = "plans" | "payment" | "processing" | "success";

const PRO_FEATURES = [
  { icon: InfinityIcon, label: "Unlimited generations", highlight: true },
  { icon: AudioLines, label: "Voice cloning (up to 20 voices)" },
  { icon: Sparkles, label: "Exaggeration & emotion controls" },
  { icon: Zap, label: "Priority A10G GPU queue" },
  { icon: Shield, label: "Private audio storage (R2)" },
  { icon: Star, label: "Early access to new models" },
];

const FREE_LIMITS = [
  "10 generations / month",
  "1 voice clone",
  "Standard GPU queue",
  "Public audio links",
];

export default function ProUpgradeModal({
  open,
  onClose,
  onRealCheckout,
  isCheckoutPending,
}: ProUpgradeModalProps) {
  const [step, setStep] = useState<ModalStep>("plans");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [upiError, setUpiError] = useState("");
  const paymentIdRef = useRef(
    `VCY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  );

  const utils = trpc.useUtils();

  // Mutation that writes PRO to the DB and refreshes the plan query
  const upgradeMutation = trpc.billing.manualUpgradePro.useMutation({
    onSuccess: () => {
      // Invalidate so sidebar + page both refetch and show PRO immediately
      utils.billing.getUserPlan.invalidate();
      toast.success("🎉 You're now on Voicey Pro!");
    },
    onError: (err) => {
      console.error("Failed to upgrade plan:", err);
      toast.error("Payment succeeded but plan update failed. Please refresh.");
    },
  });

  if (!open) return null;

  const handleClose = () => {
    setStep("plans");
    setUpiId("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setCardName("");
    setSelectedBank("");
    setUpiError("");
    setProcessingProgress(0);
    onClose();
  };

  const simulatePayment = () => {
    setStep("processing");
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setProcessingProgress(100);
        setTimeout(() => {
          // ✅ Actually update the DB so plan shows PRO
          upgradeMutation.mutate();
          setStep("success");
        }, 400);
      }
      setProcessingProgress(Math.min(progress, 100));
    }, 280);
  };

  const handlePayNow = () => {
    if (paymentMethod === "upi" && !upiId.includes("@")) {
      setUpiError("Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    setUpiError("");
    simulatePayment();
  };

  const formatCard = (val: string) =>
    val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length > 2) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  const banks = [
    { id: "sbi", name: "SBI", logo: "🏦" },
    { id: "hdfc", name: "HDFC", logo: "🏛️" },
    { id: "icici", name: "ICICI", logo: "🔵" },
    { id: "axis", name: "Axis", logo: "🟠" },
    { id: "kotak", name: "Kotak", logo: "🟡" },
    { id: "bob", name: "Bank of Baroda", logo: "🟢" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        onClick={step === "processing" ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Gradient header bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500" />

        {/* Close button — hidden during processing */}
        {step !== "processing" && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* ──────────── STEP: PLANS ──────────── */}
        {step === "plans" && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-4 border border-violet-200">
                <Sparkles className="h-3.5 w-3.5" />
                Limited Time Offer
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">
                Upgrade to{" "}
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Voicey Pro
                </span>
              </h2>
              <p className="text-zinc-500 text-sm font-medium">
                Unlock unlimited AI voice generation for just{" "}
                <strong className="text-zinc-800">₹500/month</strong>
              </p>
            </div>

            {/* Plan comparison */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Free */}
              <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/60">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-zinc-700">Free</span>
                  <span className="text-lg font-black text-zinc-900">₹0</span>
                </div>
                <ul className="space-y-2.5">
                  {FREE_LIMITS.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-500 font-medium">
                      <div className="h-4 w-4 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X className="h-2.5 w-2.5 text-zinc-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro */}
              <div className="p-5 rounded-2xl border-2 border-violet-500 bg-gradient-to-br from-violet-50 to-fuchsia-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-bl from-violet-500 to-fuchsia-500 text-white text-[9px] font-black px-2.5 py-1 rounded-bl-xl tracking-wider">
                  BEST VALUE
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-violet-700">Pro</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-zinc-900">₹500</span>
                    <span className="text-[10px] text-zinc-500 block font-bold">/month</span>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {PRO_FEATURES.map((f) => (
                    <li
                      key={f.label}
                      className={`flex items-start gap-2 text-xs font-semibold ${f.highlight ? "text-violet-700" : "text-zinc-700"}`}
                    >
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${f.highlight ? "bg-violet-500" : "bg-emerald-500"}`}>
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => setStep("payment")}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 transition-all duration-300 rounded-xl active:scale-[0.98]"
              >
                <Zap className="h-4 w-4 mr-2 fill-current" />
                Upgrade to Pro — ₹500/month
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              {onRealCheckout && (
                <Button
                  variant="outline"
                  onClick={onRealCheckout}
                  disabled={isCheckoutPending}
                  className="w-full h-10 text-xs font-semibold border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl"
                >
                  {isCheckoutPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : null}
                  Pay via Polar (Stripe/Card)
                </Button>
              )}
              <p className="text-center text-[10px] text-zinc-400 font-medium flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" />
                Secured by 256-bit encryption · Cancel anytime
              </p>
            </div>
          </div>
        )}

        {/* ──────────── STEP: PAYMENT ──────────── */}
        {step === "payment" && (
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep("plans")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <div>
                <h2 className="text-lg font-black text-zinc-900">Secure Payment</h2>
                <p className="text-xs text-zinc-500 font-medium">Voicey Pro · ₹500/month</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span className="text-[10px] text-emerald-700 font-bold">SSL Secured</span>
              </div>
            </div>

            {/* Order summary */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200/60 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                  <AudioLines className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Voicey Pro</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Monthly subscription</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-zinc-900">₹500</p>
                <p className="text-[10px] text-zinc-500 font-bold">/month</p>
              </div>
            </div>

            {/* Payment methods */}
            <div className="flex gap-2 mb-5">
              {([
                { id: "upi", label: "UPI", icon: Smartphone },
                { id: "card", label: "Card", icon: CreditCard },
                { id: "netbanking", label: "Net Banking", icon: Building2 },
              ] as { id: PaymentMethod; label: string; icon: React.ElementType }[]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all duration-200 ${
                    paymentMethod === m.id
                      ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm shadow-violet-200"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>

            {/* UPI */}
            {paymentMethod === "upi" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-700 mb-1.5 block">UPI ID</label>
                  <input
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); setUpiError(""); }}
                    placeholder="yourname@upi"
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-medium outline-none transition-all duration-200 ${
                      upiError
                        ? "border-rose-400 bg-rose-50 text-rose-800 focus:ring-2 focus:ring-rose-300"
                        : "border-zinc-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-zinc-800"
                    }`}
                  />
                  {upiError && <p className="text-xs text-rose-500 mt-1 font-medium">{upiError}</p>}
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <Smartphone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">
                    You&apos;ll receive a push notification on your UPI app to approve ₹500
                  </p>
                </div>
              </div>
            )}

            {/* Card */}
            {paymentMethod === "card" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 mb-1.5 block">Card Number</label>
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm font-mono font-medium outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 mb-1.5 block">Cardholder Name</label>
                  <input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="RAHUL SHARMA"
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm font-medium uppercase outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 mb-1.5 block">Expiry</label>
                    <input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm font-mono font-medium outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 mb-1.5 block">CVV</label>
                    <input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="•••"
                      type="password"
                      className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm font-mono font-medium outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net Banking */}
            {paymentMethod === "netbanking" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-700 block">Select Your Bank</label>
                <div className="grid grid-cols-3 gap-2">
                  {banks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBank(b.id)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all duration-200 ${
                        selectedBank === b.id
                          ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-xl">{b.logo}</span>
                      <span>{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pay Button */}
            <Button
              onClick={handlePayNow}
              className="w-full h-12 mt-6 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 transition-all rounded-xl active:scale-[0.98]"
            >
              <Lock className="h-4 w-4 mr-2" />
              Pay Securely — ₹500
            </Button>

            <div className="flex items-center justify-center gap-3 mt-4">
              {["🔒 RBI Compliant", "🛡️ PCI DSS", "✅ 3D Secure"].map((t) => (
                <span key={t} className="text-[10px] text-zinc-400 font-bold">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ──────────── STEP: PROCESSING ──────────── */}
        {step === "processing" && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[380px]">
            <div className="relative mb-8">
              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-pulse">
                <Lock className="h-9 w-9 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <Loader2 className="h-3 w-3 text-white animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">Processing Payment</h3>
            <p className="text-sm text-zinc-500 font-medium mb-8">
              Securely verifying your payment of <strong className="text-zinc-800">₹500</strong>
            </p>
            {/* Progress bar */}
            <div className="w-full max-w-xs bg-zinc-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-3 font-bold tabular-nums">
              {Math.round(processingProgress)}% — Please do not close this window
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-400 font-bold">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secured by 256-bit SSL encryption
            </div>
          </div>
        )}

        {/* ──────────── STEP: SUCCESS ──────────── */}
        {step === "success" && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            {/* Success circle */}
            <div className="relative mb-8">
              <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-in zoom-in-75 duration-500">
                <Check className="h-12 w-12 text-white stroke-[3]" />
              </div>
              <div className="absolute -top-2 -right-3 text-2xl animate-bounce">✨</div>
              <div className="absolute -bottom-2 -left-3 text-xl animate-bounce delay-150">🎉</div>
            </div>

            <h3 className="text-2xl font-black text-zinc-900 mb-2">
              Welcome to Pro! 🚀
            </h3>
            <p className="text-sm text-zinc-500 font-medium mb-2 max-w-xs">
              Your payment of <strong className="text-zinc-800">₹500</strong> was successful. You now have access to all Pro features.
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full mb-8">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">
                Payment ID: {paymentIdRef.current}
              </span>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {["Unlimited generations", "Voice cloning", "Priority GPU", "R2 Storage"].map((f) => (
                <span
                  key={f}
                  className="text-[11px] font-bold px-3 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200"
                >
                  ✓ {f}
                </span>
              ))}
            </div>

            <Button
              onClick={handleClose}
              disabled={upgradeMutation.isPending}
              className="h-12 px-8 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 transition-all rounded-xl active:scale-[0.98]"
            >
              {upgradeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Start Generating
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-[10px] text-zinc-400 mt-3 font-medium">
              Your plan has been updated · Refresh if badge still shows FREE
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
