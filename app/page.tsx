'use client';

import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";

import { useRef } from "react"; //for reseting file after form submission

// Define Types
interface FormState {
  name: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  last_exam_appeared: string;
  cgpa: string;
  domain: string;
  duration: string; // Added
  duration_unit: string;  // Added
  skills: string;
  source:string;   // For Reference 
}



interface AlertState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
];

export default function RegisterPage() {


  const fileInputRef = useRef<HTMLInputElement | null>(null); // For Null File Inputs

  // Form State
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    college: "",
    degree: "",
    last_exam_appeared: "",
    cgpa: "",
    domain: "",
    duration: "", // Added
    duration_unit: "months", // Default Added
    source:"",   // For Reference 
    skills: "",
  });

  const [resume_path, setResume] = useState<File | null>(null);
  
  const [alert, setAlert] = useState<AlertState>({ show: false, message: "", type: "success" });

  // Email Verification State

  const [emailStep, setEmailStep] = useState<"email" | "sent" | "verified">("email");
  
  const [loading, setLoading] = useState(false);


  
  
  //----------------------

  // Alert auto-hide

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  const showAlert = (message: string, type: 'success' | 'error' = "error") => {
    setAlert({ show: true, message, type });
  };
  //-----------------------------------------------------------------
/* ---------------- CHECK REDIRECT AFTER EMAIL VERIFY ---------------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("verified") === "1") {
      const email = params.get("email");

      if (email) 
      {
        setForm(prev => ({ ...prev, email }));
        setEmailStep("verified");
        showAlert("Email verified successfully!", "success");
      }

      
    }
  }, []);

  /* ---------------- SEND VERIFICATION LINK ---------------- */

  const sendVerificationLink = async () => {
    if (!form.email) {
      showAlert("Enter email first", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        // `${process.env.NEXT_PUBLIC_API_URL}/api/applicant/send-verification`,
        "https://mansi.durvasaprakrutik.com/api/applicant/send-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: form.email }),
        }
      );
const data = await res.json();

if (!res.ok) throw new Error(data.message);

/*
|--------------------------------------------------------------------------
| ✅ HANDLE ALREADY VERIFIED EMAIL
|--------------------------------------------------------------------------
*/
if (data.verified === true) {
  setEmailStep("verified");
  showAlert(data.message || "Email already verified", "success");
} else {
  setEmailStep("sent");
  showAlert(data.message || "Verification link sent", "success");
}

    } catch (e: any) {
      showAlert(e.message || "Failed to send email", "error");
    } finally {
      setLoading(false);
    }
  };

  //---------------------


//----------------------------


// Phone input handler

  const handlePhoneChange = (v: string) => {
    
    // const onlyNums = v.replace(/[^0-9]/g, "");
    // if (onlyNums.length <= 10) {
    //   setForm({ ...form, phone: onlyNums });
    //   if (onlyNums.length === 10) setErrors(prev => ({ ...prev, phone: "" }));
    // }

     const onlyNums = v.replace(/\D/g, "").slice(0, 10);
  setForm({ ...form, phone: onlyNums });

  };

  ///--------------------

  // Resume upload
  const handleResumeChange = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showAlert("Only PDF or Word files allowed", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showAlert("File size must be less than 10MB", "error");
      return;
    }
    setResume(file);
    //setErrors(prev => ({ ...prev, resume_path: "" }));
  };

  // ---------------------------------


  //----------------------------------------------

  // Form submit

  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (emailStep !== "verified") {
    showAlert("Please verify your email before submitting", "error");
    return;
  }

  if (!resume_path) {
    showAlert("Please upload resume", "error");
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    formData.append("resume_path", resume_path);

    const res = await fetch(
      "https://mansi.durvasaprakrutik.com/api/applicant/submit",
      {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      // Laravel validation errors
      if (data.errors) {
        const firstError = Object.values(data.errors)[0] as string[];
        throw new Error(firstError[0]);
      }
      throw new Error(data.message || "Submission failed");
    }

    showAlert("Application submitted successfully!", "success");

    setForm({
      name: "",
      email: "",
      phone: "",
      college: "",
      degree: "",
      last_exam_appeared: "",
      cgpa: "",
      domain: "",
      duration: "",
      duration_unit: "months",
      source: "",
      skills: "",
    });

    setResume(null);
    setEmailStep("email");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

  } catch (err: any) {
    showAlert(err.message || "Server error", "error");
  } finally {
    setLoading(false);
  }
};

   /* ===================================================== */

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 py-10 px-4 relative">

      {/* ALERT */}

      {alert.show && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center p-4 mb-4 w-full max-w-xs rounded-lg shadow-2xl border ${alert.type === "success" ? "bg-green-600 border-green-700" : "bg-red-600 border-red-700"} text-white transition-all animate-bounce`}>
          <div className="ml-3 text-sm font-bold">
            {alert.message}
          </div>

              <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} 
                      className="ml-auto bg-white/20 hover:bg-white/40 rounded-lg p-1">✕
              </button>
        </div>)
      }

      {/* ---------------------------------- */}

      {/* Form  */}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200">

        {/* HEADER */}

        <div className="text-center -mt-12">
          <div className="flex justify-center mb-0 -mt-10"> 
            <div className="relative w-48 md:w-64 transition-transform duration-300 hover:scale-105">

              {/* Logo  */}

              <Image src="/TsLogo.png" 
                     alt="TechStrota Logo" 
                     width={600} 
                     height={175} 
                     style={{ width: '100%', height: 'auto' }} 
                     priority 
                />

            </div>
          </div>
            {/* Title */}
            <p className="font-bold -mt-12 mb-15 underline decoration-blue-200 text-3xl" 
              style={{ color: '#2379C0' }}>
                Internship Registration Form
            </p>
        </div>
        {/* ------------------------------------------- */}
        {/* EMAIL VERIFICATION */}
          <div className="mb-4">
            <Input label="Email Address" type="email" required 
                   placeholder="Enter your email" value={form.email} 
                    onChange={(v) => { setForm({ ...form, email: v }); setEmailStep("email"); }} 
                   
              />
              
            
            { emailStep === "email" && 
              <button type="button" onClick={sendVerificationLink} disabled={loading} 
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
                Send Verification Link
              </button>
            }
            
            {emailStep === "sent" && (
               <p className="text-blue-600 mt-2">
            Check your email for verification link
          </p>
              )}


            {emailStep === "verified" && <p className="text-green-600 font-semibold mt-1">✔ Email verified</p>}
          </div>
            
        {/* ------------------------------------------ */}

        {/* REST OF FORM */}
        <div className="relative">
        {emailStep !== "verified" && (
      <div
        onClick={() => 
          // if (emailStep !== "verified") {
            showAlert("Please verify your email first", "error")
          }
          className="absolute inset-0 z-20 cursor-not-allowed"
       // }}
      />
      )}
        <fieldset
          disabled={emailStep !== "verified"}
          className={emailStep !== "verified" ? "opacity-60" : ""}
        > 
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Full Name" required placeholder="Enter full name" value={form.name}  onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Phone Number" type="tel" required placeholder="Enter Phone Number" value={form.phone}  onChange={handlePhoneChange} />
            <Input label="College Name" required placeholder="Enter college name" value={form.college}  onChange={(v) => setForm({ ...form, college: v })} />
            <Input label="Degree" required placeholder="Enter Degree e.g B.Tech, BCA" value={form.degree}  onChange={(v) => setForm({ ...form, degree: v })} />
            <Input label="Last Exam Appeared" required placeholder="e.g. Sem 3, Sem 6, Final Year" value={form.last_exam_appeared}  onChange={(v) => setForm({ ...form, last_exam_appeared: v })} />
            <Input label="CGPA / Percentage" type="number" required placeholder="e.g. 8.5, 85.5" value={form.cgpa}  onChange={(v) => setForm({ ...form, cgpa: v })} />
            <Input label="Preferred Domain" required placeholder="Enter Your Domain" value={form.domain}  onChange={(v) => setForm({ ...form, domain: v })} />
            
            {/* DURATION FIELD START */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700">
                Duration <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  placeholder="Duration"
                  value={form.duration}
                  className="w-1/2 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
                <select
                  value={form.duration_unit}
                  className="w-1/2 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  onChange={(e) => setForm({ ...form, duration_unit: e.target.value })}
                >
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              
            </div>
            {/* DURATION FIELD END */}
 {/* Reference FIELD START */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700">
                How did you hear about us?  <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                
                <select
                  value={form.source}
                  className="w-1/2 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  <option value="website">Website</option>
                  <option value="search">Search</option>
                  <option value="social">Social Media</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="friend">Friend</option>
                  <option value="college">College/Institute</option>
                </select>
              </div>
              
            </div>
            {/* Reference FIELD END */}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold mb-1">Skills (comma separated)<span className="text-red-500">*</span></label>
            <textarea value={form.skills} placeholder="e.g. React, Node.js, PHP, Tailwind" className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 bg-white text-slate-900" onChange={(e) => setForm({ ...form, skills: e.target.value })} />
           
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold mb-1">Upload Resume (Max 10 MB)<span className="text-red-500">*</span></label>
            <input 
            ref={fileInputRef}
            type="file" accept=".pdf"
            className="w-full border p-2 rounded-lg bg-white text-slate-900" 
            onChange={(e) => handleResumeChange(e.target.files?.[0])} />
            
          </div>

          <button disabled={loading} type="submit" className={`mt-8 w-full py-4 rounded-lg font-bold text-white transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg'}`}>
            {loading ? "Submitting Application..." : "Apply Now"}
          </button>
        </fieldset>
        </div>
      </form>
    </div>
  );
}

interface InputProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}

function Input({ label, type = "text", placeholder, value, onChange, required, error }: InputProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1 text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={type === "tel" ? 10 : undefined}
        className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}