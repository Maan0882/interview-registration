'use client';

import { useState, useEffect, FormEvent, useRef } from "react";
import Image from "next/image";

// --- Types ---
interface FormState {
  name: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  last_exam_appeared: string;
  cgpa: string;
  domain: string;
  duration: string; 
  duration_unit: string;  
  skills: string; 
}

interface AlertState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf"];

export default function RegisterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- State ---
  const [form, setForm] = useState<FormState>({
    name: "", email: "", phone: "", college: "", degree: "",
    last_exam_appeared: "", cgpa: "", domain: "", duration: "", 
    duration_unit: "months", skills: "",
  });

  const [resume_path, setResume] = useState<File | null>(null);
  const [alert, setAlert] = useState<AlertState>({ show: false, message: "", type: "success" });
  const [emailStep, setEmailStep] = useState<"email" | "sent" | "verified">("email");
  const [loading, setLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string>("");
  const [submittedAppCode, setSubmittedAppCode] = useState<string | null>(null);

  // --- Effects ---

  // Lock scroll when success modal is active
  useEffect(() => {
    if (submittedAppCode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [submittedAppCode]);

  // Alert auto-hide
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Catch verification link from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (token && email) {
      setForm(prev => ({ ...prev, email }));
      setVerificationToken(token); 
      setEmailStep("verified");
      showAlert("Email verified! Please complete the form.", "success");
      // Clean URL params without refresh
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // --- Handlers ---

  const showAlert = (message: string, type: 'success' | 'error' = "error") => {
    setAlert({ show: true, message, type });
  };

  const sendVerificationLink = async () => {
    if (!form.email || !form.email.includes('@')) {
      showAlert("Please enter a valid email address", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setEmailStep("sent");
      showAlert("Verification link sent! Check your inbox.", "success");
    } catch (e: any) {
      showAlert(e.message || "Failed to send email", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (v: string) => {
    const onlyNums = v.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, phone: onlyNums });
  };

  const handleResumeChange = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showAlert("Only PDF files allowed", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showAlert("File size must be less than 10MB", "error");
      return;
    }
    setResume(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (emailStep !== "verified") {
      showAlert("Please verify your email first", "error");
      return;
    }

    if (!resume_path) {
      showAlert("Please upload your resume", "error");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();  
      Object.entries(form).forEach(([k, v]) => formData.append(k, v as string));
      formData.append("token", verificationToken); 
      formData.append("resume_path", resume_path);

      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      // Success! Show code modal
      setSubmittedAppCode(data.appCode);

      // Reset Form
      setForm({
        name: "", email: "", phone: "", college: "", degree: "",
        last_exam_appeared: "", cgpa: "", domain: "", duration: "",
        duration_unit: "months", skills: "",
      });
      setResume(null);
      setEmailStep("email");
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err: any) {
      showAlert(err.message || "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 py-10 px-4 relative font-sans">
      
      {/* SUCCESS MODAL (MOBILE RESPONSIVE OVERLAY) */}
      {submittedAppCode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md text-center border-b-8 border-green-500 animate-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500 text-white rounded-full p-4 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-black text-slate-800">SUCCESS!</h3>
            <p className="text-slate-600 mt-2 text-sm md:text-base px-2">
              Your application has been received and is under review.
            </p>
            
            <div className="mt-8 p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl relative">
              <p className="text-[10px] uppercase tracking-[0.3em] text-blue-600 font-black mb-2">
                Your Application Code
              </p>
              <p className="text-2xl md:text-4xl font-mono font-black text-blue-800 break-all select-all">
                {submittedAppCode}
              </p>
            </div>
            
            <p className="text-[11px] text-slate-400 mt-6 italic">
              Please take a screenshot of this code for future reference.
            </p>
            
            <button 
              onClick={() => setSubmittedAppCode(null)}
              className="mt-4 w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all active:scale-95 shadow-xl"
            >
              Close & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {alert.show && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-70 flex items-center p-4 w-[92%] max-w-xs rounded-xl shadow-2xl border ${alert.type === "success" ? "bg-green-600 border-green-500" : "bg-red-600 border-red-500"} text-white transition-all animate-in slide-in-from-top-full duration-300`}>
          <div className="text-sm font-bold flex-1">{alert.message}</div>
          <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} className="ml-2 p-1 bg-white/10 rounded">✕</button>
        </div>
      )}

      {/* MAIN FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="flex justify-center -mt-10 md:-mt-14 mb-2"> 
            <div className="relative w-48 md:w-64 transition-transform hover:scale-105">
              <Image src="/TsLogo.png" alt="TechStrota Logo" width={600} height={175} style={{ width: '100%', height: 'auto' }} priority />
            </div>
          </div>
          <h1 className="font-black text-2xl md:text-4xl tracking-tight" style={{ color: '#2379C0' }}>
            Internship <span className="text-slate-800">Registration</span>
          </h1>
          <div className="h-1.5 w-20 bg-blue-500 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* EMAIL SECTION */}
        <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <Input 
            label="Email Address" 
            type="email" 
            required 
            placeholder="example@domain.com" 
            value={form.email} 
            onChange={(v) => { setForm({ ...form, email: v }); setEmailStep("email"); }} 
          />
            
          { emailStep === "email" && 
            <button 
              type="button" 
              onClick={sendVerificationLink} 
              disabled={loading} 
              className="mt-3 w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
            >
              {loading ? "Verifying..." : "Send Verification Link"}
            </button>
          }
          
          {emailStep === "sent" && (
            <div className="flex items-center gap-2 mt-3 text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-pulse">
               <span className="text-lg">📧</span>
               <p className="text-xs md:text-sm font-bold">Verification link sent! Check your inbox (valid for 10 mins).</p>
            </div>
          )}
          
          {emailStep === "verified" && (
            <div className="flex items-center gap-2 mt-3 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
               <span className="text-lg">✔</span>
               <p className="text-xs md:text-sm font-bold">Email verified! You can now complete the form.</p>
            </div>
          )}
        </div>

        {/* FORM FIELDS */}
        <div className="relative">
          {emailStep !== "verified" && (
            <div 
              onClick={() => showAlert("Please verify your email to unlock the form", "error")} 
              className="absolute inset-0 z-20 cursor-not-allowed" 
            />
          )}
          
          <fieldset disabled={emailStep !== "verified"} className={`space-y-6 transition-all duration-500 ${emailStep !== "verified" ? "opacity-40 grayscale" : ""}`}> 
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <Input label="Full Name" required placeholder="John Doe" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Phone Number" type="tel" required placeholder="10 Digit Number" value={form.phone} onChange={handlePhoneChange} />
              <Input label="College Name" required placeholder="University / College" value={form.college} onChange={(v) => setForm({ ...form, college: v })} />
              <Input label="Degree" required placeholder="e.g. B.Tech CS, BCA" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} />
              <Input label="Last Exam Appeared" required placeholder="e.g. Semester 6" value={form.last_exam_appeared} onChange={(v) => setForm({ ...form, last_exam_appeared: v })} />
              <Input label="CGPA / Percentage" required placeholder="e.g. 8.5 or 85%" value={form.cgpa} onChange={(v) => setForm({ ...form, cgpa: v })} />
              <Input label="Preferred Domain" required placeholder="e.g. Web Development" value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
              
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-500">Duration <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input type="number" required placeholder="0" value={form.duration} className="w-1/3 border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 focus:bg-white outline-none bg-slate-50 text-slate-900 transition-all" onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                  <select value={form.duration_unit} className="w-2/3 border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 focus:bg-white outline-none bg-slate-50 text-slate-900 transition-all font-bold" onChange={(e) => setForm({ ...form, duration_unit: e.target.value })}>
                    <option value="months">Months</option>
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-500">Skills (Comma Separated) <span className="text-red-500">*</span></label>
              <textarea value={form.skills} placeholder="React, Node.js, SQL, Figma..." className="w-full border-2 border-slate-100 p-4 rounded-xl focus:border-blue-500 focus:bg-white outline-none h-28 bg-slate-50 text-slate-900 transition-all resize-none" onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-500">Upload Resume (PDF ONLY) <span className="text-red-500">*</span></label>
              <div className="relative group">
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".pdf" 
                  className="w-full border-2 border-dashed border-slate-200 p-4 rounded-xl bg-slate-50 text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer transition-all" 
                  onChange={(e) => handleResumeChange(e.target.files?.[0])} 
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              type="submit" 
              className={`mt-10 w-full py-5 rounded-2xl font-black text-xl text-white transition-all transform active:scale-[0.97] shadow-2xl ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'}`}
            >
              {loading ? "Processing..." : "Submit Application"}
            </button>
          </fieldset>
        </div>
      </form>
    </div>
  );
}

// --- Reusable Input Component ---
interface InputProps { 
  label: string; 
  type?: string; 
  placeholder: string; 
  value: string; 
  onChange: (v: string) => void; 
  required?: boolean; 
}

function Input({ label, type = "text", placeholder, value, onChange, required }: InputProps) {
  return (
    <div className="w-full">
      <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type={type} 
        value={value} 
        placeholder={placeholder} 
        maxLength={type === "tel" ? 10 : undefined} 
        className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 focus:bg-white outline-none bg-slate-50 text-slate-900 transition-all placeholder:text-slate-300" 
        onChange={(e) => onChange(e.target.value)} 
        required={required}
      />
    </div>
  );
}