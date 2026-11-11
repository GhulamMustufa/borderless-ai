import type { VisaProfile } from "@/lib/types";
import { useState, useEffect } from "react";

type WhatIfSimulatorProps = {
  initialProfile: VisaProfile;
  onChange: (profile: VisaProfile) => void;
  onReset: () => void;
};

export function WhatIfSimulator({ initialProfile, onChange, onReset }: WhatIfSimulatorProps) {
  const [profile, setProfile] = useState<VisaProfile>(initialProfile);
  const [isDirty, setIsDirty] = useState(false);

  // When initialProfile changes from the top-level (e.g., initial load), reset local state
  useEffect(() => {
    setProfile(initialProfile);
    setIsDirty(false);
  }, [initialProfile]);

  const handleChange = (updates: Partial<VisaProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    setIsDirty(true);
    onChange(newProfile);
  };

  const handleReset = () => {
    setProfile(initialProfile);
    setIsDirty(false);
    onReset();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-indigo-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          What-If Simulator
        </h2>
        {isDirty && (
          <button 
            onClick={handleReset}
            className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        Try changing your details below to see how your score would improve.
      </p>

      <div className="space-y-4">
        {/* English Test Score */}
        <div>
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            English Test
          </label>
          <select 
            value={profile.englishTest}
            onChange={(e) => {
               const val = e.target.value as VisaProfile["englishTest"];
               handleChange({ 
                 englishTest: val, 
                 testScore: val === "none" ? null : (val === "ielts" ? 7 : 90) 
               });
            }}
            className="w-full mb-3 rounded-md border border-slate-200 dark:border-slate-700 text-sm p-2 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:border-indigo-400 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-900/50 focus:ring-opacity-50"
          >
            <option value="none">No test yet</option>
            <option value="ielts">IELTS</option>
            <option value="toefl">TOEFL</option>
          </select>

          {profile.englishTest !== "none" && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {profile.englishTest} Score
                </label>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{profile.testScore}</span>
              </div>
              <input 
                type="range"
                min={profile.englishTest === "ielts" ? 4 : 40}
                max={profile.englishTest === "ielts" ? 9 : 120}
                step={profile.englishTest === "ielts" ? 0.5 : 5}
                value={profile.testScore ?? 0}
                onChange={(e) => handleChange({ testScore: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Work Experience */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Work Experience (Years)
            </label>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{profile.yearsExperience}</span>
          </div>
          <input 
            type="range"
            min={0}
            max={20}
            step={1}
            value={profile.yearsExperience}
            onChange={(e) => handleChange({ yearsExperience: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Savings */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Available Savings (USD)
            </label>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">${profile.savingsUsd.toLocaleString()}</span>
          </div>
          <input 
            type="range"
            min={0}
            max={100000}
            step={1000}
            value={profile.savingsUsd}
            onChange={(e) => handleChange({ savingsUsd: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Education Level */}
        <div>
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            Highest Education
          </label>
          <select 
            value={profile.education}
            onChange={(e) => handleChange({ education: e.target.value as VisaProfile["education"] })}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 text-sm p-2 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:border-indigo-400 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-900/50 focus:ring-opacity-50"
          >
            <option value="high_school">High School</option>
            <option value="bachelor">Bachelor&apos;s Degree</option>
            <option value="master">Master&apos;s Degree</option>
            <option value="phd">PhD / Doctorate</option>
          </select>
        </div>

      </div>
    </div>
  );
}
