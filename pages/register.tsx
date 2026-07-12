"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [role, setRole] = useState("Employee");

  const [submitting, setSubmitting] = useState(false);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit logic
      setSubmitting(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const sections = ["Identity", "Security", "Organization", "Finalize"];

  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md bg-[#f9f9f7] text-[#1a1c1b] selection:bg-primary-fixed selection:text-on-primary-fixed relative">
      {/* Header */}
      <header className="w-full top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border-hairline h-20 flex items-center px-container-padding justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display-lg text-headline-md font-bold tracking-tighter text-on-surface">
            AssetFlow
          </span>
        </div>
        <div className="hidden md:flex gap-gutter items-center">
          <span className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
            Enterprise Edition v4.0
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center py-section-margin px-container-padding">
        <div className="w-full max-w-xl">
          {/* Welcome Header */}
          <div className="mb-12">
            <p className="font-label-mono text-label-mono text-primary uppercase tracking-widest mb-2 text-xs font-semibold">
              § 0{currentStep} · {sections[currentStep - 1]}
            </p>
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              {currentStep === 1 && (
                <>
                  Start <span className="font-display-lg-italic italic text-primary font-normal">managing</span>.
                </>
              )}
              {currentStep === 2 && (
                <>
                  Secure your <span className="font-display-lg-italic italic text-primary font-normal">account</span>.
                </>
              )}
              {currentStep === 3 && (
                <>
                  Define your <span className="font-display-lg-italic italic text-primary font-normal">context</span>.
                </>
              )}
              {currentStep === 4 && (
                <>
                  Ready to <span className="font-display-lg-italic italic text-primary font-normal">launch</span>.
                </>
              )}
            </h1>
          </div>

          {/* Stepper Progress Indicators */}
          <div className="relative mb-12">
            <div className="flex justify-between items-center w-full">
              {/* Step 1 Indicator */}
              <div className="flex flex-col items-start gap-2">
                <div
                  className={`w-12 h-1 transition-colors duration-300 ${
                    currentStep >= 1 ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                ></div>
                <span
                  className={`font-label-mono text-label-mono uppercase text-[10px] tracking-wider transition-opacity duration-300 ${
                    currentStep === 1 ? "text-primary font-bold opacity-100" : "text-secondary opacity-50"
                  }`}
                >
                  Profile
                </span>
              </div>

              {/* Step 2 Indicator */}
              <div className="flex flex-col items-start gap-2">
                <div
                  className={`w-12 h-1 transition-colors duration-300 ${
                    currentStep >= 2 ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                ></div>
                <span
                  className={`font-label-mono text-label-mono uppercase text-[10px] tracking-wider transition-opacity duration-300 ${
                    currentStep === 2 ? "text-primary font-bold opacity-100" : "text-secondary opacity-50"
                  }`}
                >
                  Security
                </span>
              </div>

              {/* Step 3 Indicator */}
              <div className="flex flex-col items-start gap-2">
                <div
                  className={`w-12 h-1 transition-colors duration-300 ${
                    currentStep >= 3 ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                ></div>
                <span
                  className={`font-label-mono text-label-mono uppercase text-[10px] tracking-wider transition-opacity duration-300 ${
                    currentStep === 3 ? "text-primary font-bold opacity-100" : "text-secondary opacity-50"
                  }`}
                >
                  Organization
                </span>
              </div>

              {/* Step 4 Indicator */}
              <div className="flex flex-col items-start gap-2">
                <div
                  className={`w-12 h-1 transition-colors duration-300 ${
                    currentStep >= 4 ? "bg-primary" : "bg-surface-container-highest"
                  }`}
                ></div>
                <span
                  className={`font-label-mono text-label-mono uppercase text-[10px] tracking-wider transition-opacity duration-300 ${
                    currentStep === 4 ? "text-primary font-bold opacity-100" : "text-secondary opacity-50"
                  }`}
                >
                  Finalize
                </span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-border-hairline p-card-padding relative overflow-hidden">
            <div className="space-y-8">
              {/* Step 1: Profile */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                        First Name
                      </label>
                      <input
                        className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface placeholder:text-surface-dim focus:border-primary focus:outline-none transition-all"
                        placeholder="ALEXANDER"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                        Last Name
                      </label>
                      <input
                        className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface placeholder:text-surface-dim focus:border-primary focus:outline-none transition-all"
                        placeholder="HAMILTON"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                      Work Email
                    </label>
                    <input
                      className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface placeholder:text-surface-dim focus:border-primary focus:outline-none transition-all"
                      placeholder="A.HAMILTON@TREASURY.GOV"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Security */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                      Account Password
                    </label>
                    <input
                      className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface placeholder:text-surface-dim focus:border-primary focus:outline-none transition-all"
                      placeholder="••••••••••••"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                      Confirm Password
                    </label>
                    <input
                      className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface placeholder:text-surface-dim focus:border-primary focus:outline-none transition-all"
                      placeholder="••••••••••••"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Organization */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                      Department
                    </label>
                    <select
                      className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface focus:border-primary focus:outline-none transition-all"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="Treasury">Treasury</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Operations">Operations</option>
                      <option value="Compliance">Compliance</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-secondary uppercase tracking-widest text-xs">
                      Role / Position
                    </label>
                    <input
                      className="bg-transparent border-t-0 border-l-0 border-r-0 border-b border-border-hairline py-3 font-body-md text-on-surface placeholder:text-surface-dim focus:border-primary focus:outline-none transition-all"
                      placeholder="Staff Associate"
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Finalize */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    Please review your context details below before generating your workspace identity.
                  </p>
                  <div className="border border-border-hairline divide-y divide-border-hairline text-sm">
                    <div className="flex justify-between p-3">
                      <span className="font-label-mono text-secondary text-xs">Full Name</span>
                      <span className="font-bold text-on-surface">
                        {firstName || "Alexander"} {lastName || "Hamilton"}
                      </span>
                    </div>
                    <div className="flex justify-between p-3">
                      <span className="font-label-mono text-secondary text-xs">Email Address</span>
                      <span className="font-semibold text-on-surface">
                        {email || "a.hamilton@treasury.gov"}
                      </span>
                    </div>
                    <div className="flex justify-between p-3">
                      <span className="font-label-mono text-secondary text-xs">Department</span>
                      <span className="text-on-surface">{department}</span>
                    </div>
                    <div className="flex justify-between p-3">
                      <span className="font-label-mono text-secondary text-xs">Position</span>
                      <span className="text-on-surface">{role || "Staff Associate"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-border-hairline">
                <button
                  className={`font-label-mono text-label-mono text-secondary uppercase tracking-widest flex items-center gap-2 hover:text-primary transition-colors cursor-pointer text-xs ${
                    currentStep === 1 ? "opacity-0 pointer-events-none" : ""
                  }`}
                  onClick={handlePrev}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Previous
                </button>
                <button
                  className="bg-primary text-on-primary px-8 py-4 font-label-mono text-label-mono uppercase tracking-[0.2em] hover:bg-opacity-90 transition-all flex items-center gap-3 rounded-none cursor-pointer text-xs"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {submitting ? (
                    "Creating Account..."
                  ) : currentStep === 4 ? (
                    <>
                      Complete Setup
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </>
                  ) : (
                    <>
                      Next Step
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-secondary font-label-mono text-label-mono uppercase tracking-widest text-xs">
            Already registered?{" "}
            <Link className="text-primary font-bold hover:underline" href="/login">
              Log In
            </Link>
          </p>
        </div>
      </main>

      {/* Background Graphic Sidebar */}
      <div className="fixed top-0 right-0 w-1/3 h-full -z-10 opacity-20 pointer-events-none hidden lg:block">
        <div
          className="w-full h-full bg-cover bg-center grayscale contrast-75"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCHJQ7Henj2siDaCrBy_RaleooNDKm6HrBG4VybwAtG45mZLAeya751td7HTB00Y0HU1wylQXC31yUUDwh58RSDhe4n60fiTUoC9cKVL-eGuROuy6AO4o2J-J3BpzCfH1UWwwzl7Osx8vT7J2q5i2KUMR1-r8fL0QbMUC5-aLTO7jSwxooOHhFFUyF031Bz6DNNSOOQ9kzOb3JLjITlgji_JAaTIdqMEsyYYxvtULC3BnXYwwrw')",
          }}
        ></div>
      </div>

      {/* Footer */}
      <footer className="w-full py-gutter px-container-padding border-t border-border-hairline bg-background z-50">
        <div className="flex flex-col md:flex-row justify-between gap-gutter items-center text-xs">
          <p className="font-label-mono text-label-mono text-secondary">
            © 2024 ASSETFLOW SYSTEMS. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-gutter">
            <Link
              className="font-label-mono text-label-mono text-secondary hover:text-primary hover:underline transition-all"
              href="#"
            >
              PRIVACY
            </Link>
            <Link
              className="font-label-mono text-label-mono text-secondary hover:text-primary hover:underline transition-all"
              href="#"
            >
              TERMS
            </Link>
            <Link
              className="font-label-mono text-label-mono text-secondary hover:text-primary hover:underline transition-all"
              href="#"
            >
              SECURITY
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
