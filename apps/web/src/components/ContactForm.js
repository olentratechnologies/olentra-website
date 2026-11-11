"use client";

import { useState } from 'react';
import { CheckCheck, CheckCircle, ChevronDown, Upload } from 'lucide-react';
import { contactInfo } from '../data/contact';

const BUDGET_OPTIONS = [
  'Still Evaluating',
  'Less than $5K',
  '$5K - $15K',
  '$15K - $35K',
  'More than $35K',
];

const fieldBase =
  'w-full bg-transparent border-0 border-b border-white/25 text-white placeholder:text-white/50 text-[15px] md:text-[16px] pb-3 pr-8 outline-none transition-colors duration-200 focus:border-[#3B82F6]';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    budget: '',
  });
  const [attachment, setAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && (file.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name))) {
      e.target.value = '';
      setAttachment(null);
      setError('Please choose a PDF, DOC or DOCX file up to 5 MB.');
      return;
    }
    setAttachment(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const message = formData.message.trim();

    if (!name || !email || !phone) {
      setError('Please fill in your name, email and contact number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!formData.budget) {
      setError('Please select your budget range.');
      return;
    }
    if (message.length < 20) {
      setError('Please add a little more project detail (at least 20 characters).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const body = new FormData();
      Object.entries({ name, email, phone, message, budget: formData.budget })
        .forEach(([key, value]) => body.append(key, value));
      if (attachment) body.append('attachment', attachment);
      const response = await fetch('/api/contact', {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(25_000),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || 'Unable to submit your request right now. Please try again.');
        return;
      }

      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        budget: '',
      });
      setAttachment(null);
    } catch (err) {
      setError(`Unable to submit right now. Please email us directly at ${contactInfo.email}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNameFilled = formData.name.trim().length > 0;
  const isEmailFilled = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPhoneFilled = formData.phone.trim().length >= 7;
  const isBudgetFilled = Boolean(formData.budget);
  const isMessageFilled = formData.message.trim().length >= 20;

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="scroll-mt-28 md:scroll-mt-32 relative overflow-hidden bg-[#05070b] py-16 md:py-24 isolate"
      style={{ fontFamily: 'var(--font-manrope), ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Blue ambience */}
      <div className="absolute -top-32 right-0 w-[520px] h-[520px] rounded-full bg-[#1877F2]/[0.07] blur-[130px] pointer-events-none" />
      <div
        className="absolute inset-0 z-[-1] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#a5c9ff06 1px, transparent 1px), linear-gradient(90deg, #a5c9ff06 1px, transparent 1px)',
          backgroundSize: '100px 100px',
          maskImage: 'linear-gradient(transparent, #000, transparent)',
          WebkitMaskImage: 'linear-gradient(transparent, #000, transparent)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 md:px-8">
        {isSubmitted ? (
          <div
            data-testid="contact-success"
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 md:py-16 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-[#1877F2]/15 border border-[#1877F2]/40 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-[#3B82F6]" />
            </div>
            <h3 className="text-white text-2xl md:text-3xl font-semibold tracking-tight mb-3">
              Request Received
            </h3>
            <p className="text-white/55 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
              Thank you. Our team will review your inquiry and respond shortly — usually within 24 hours.
            </p>
            <button
              data-testid="send-another-message"
              onClick={() => setIsSubmitted(false)}
              className="inline-flex items-center justify-center rounded-full bg-[#1877F2] hover:bg-[#1565d8] px-7 py-3 text-[13px] font-semibold text-white transition-colors"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} data-testid="contact-form" noValidate>
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl sm:text-4xl md:text-[42px] font-bold tracking-tight leading-tight bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#2563EB] bg-clip-text text-transparent">
                Share Your Project Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {/* Full Name */}
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  maxLength={100}
                  data-testid="contact-name-input"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  aria-label="Full Name"
                  autoComplete="name"
                  className={fieldBase}
                />
                {isNameFilled && (
                  <CheckCheck
                    size={19}
                    strokeWidth={2.5}
                    className="pointer-events-none absolute right-0 bottom-3 text-[#10B981] transition-all"
                  />
                )}
              </div>

              {/* Email */}
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  maxLength={254}
                  data-testid="contact-email-input"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email*"
                  aria-label="Email"
                  autoComplete="email"
                  className={fieldBase}
                />
                {isEmailFilled && (
                  <CheckCheck
                    size={19}
                    strokeWidth={2.5}
                    className="pointer-events-none absolute right-0 bottom-3 text-[#10B981] transition-all"
                  />
                )}
              </div>

              {/* Budget */}
              <div className="relative">
                <select
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  aria-label="Select a Budget Range*"
                  required
                  className={`${fieldBase} appearance-none pr-12 cursor-pointer ${
                    formData.budget ? 'text-white' : 'text-white/45'
                  }`}
                >
                  <option value="" disabled className="bg-[#0b111b] text-white/60">
                    Select a Budget Range*
                  </option>
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-[#0b111b] text-white">
                      {option}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-1 bottom-3.5 flex items-center gap-1.5">
                  {isBudgetFilled && (
                    <CheckCheck size={19} strokeWidth={2.5} className="text-[#10B981]" />
                  )}
                  <ChevronDown size={16} className="text-white/70" />
                </div>
              </div>

              {/* Phone */}
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  maxLength={20}
                  data-testid="contact-phone-input"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Contact Number*"
                  aria-label="Contact Number"
                  autoComplete="tel"
                  className={fieldBase}
                />
                {isPhoneFilled && (
                  <CheckCheck
                    size={19}
                    strokeWidth={2.5}
                    className="pointer-events-none absolute right-0 bottom-3 text-[#10B981] transition-all"
                  />
                )}
              </div>

              {/* Project description */}
              <div className="md:col-span-2 relative">
                <textarea
                  name="message"
                  maxLength={10000}
                  data-testid="contact-message-input"
                  rows={3}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Describe your project… (Minimum 20 characters required)"
                  aria-label="Describe your project"
                  className={`${fieldBase} resize-y min-h-[110px] leading-relaxed pr-8`}
                />
                {isMessageFilled && (
                  <CheckCheck
                    size={19}
                    strokeWidth={2.5}
                    className="pointer-events-none absolute right-0 top-3 text-[#10B981] transition-all"
                  />
                )}
                <div className="flex items-center justify-between pt-1.5 text-[12px]">
                  <span
                    className={`transition-colors ${
                      isMessageFilled ? 'text-[#10B981] font-medium' : 'text-white/45'
                    }`}
                  >
                    {isMessageFilled
                      ? '✓ Minimum requirement met'
                      : 'Minimum 20 characters required'}
                  </span>
                  <span
                    className={`tabular-nums transition-colors ${
                      isMessageFilled ? 'text-[#10B981] font-semibold' : 'text-white/40'
                    }`}
                  >
                    {formData.message.trim().length}/20 min
                  </span>
                </div>
              </div>

              {/* File attachment */}
              <div className="md:col-span-2">
                <label className="flex items-center justify-between gap-4 border-0 border-b border-white/25 pb-3 cursor-pointer transition-colors duration-200 focus-within:border-[#3B82F6] hover:border-white/40">
                  <span
                    className={`truncate text-[15px] md:text-[16px] ${attachment ? 'text-white' : 'text-white/45'}`}
                  >
                    {attachment ? attachment.name : 'Attach PDF/Doc File (max 5 MB)'}
                  </span>
                  {attachment ? (
                    <CheckCheck size={20} strokeWidth={2.5} className="text-[#10B981] shrink-0" />
                  ) : (
                    <Upload size={20} className="text-white shrink-0" />
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFile}
                    className="sr-only"
                    aria-label="Attach PDF or Doc file"
                  />
                </label>
              </div>

              {/* Trust signals */}
              <div className="md:col-span-2 flex flex-wrap items-center justify-start gap-4 md:gap-8 pt-1 text-left">
                <p className="flex items-center gap-3 text-white text-[14px] md:text-[15px]">
                  <CheckCheck size={22} className="text-[#2563EB] shrink-0" strokeWidth={2.4} />
                  <span>
                    Get a response in <strong className="font-bold">2 minutes</strong>
                  </span>
                </p>
                <p className="flex items-center gap-3 text-white text-[14px] md:text-[15px]">
                  <CheckCheck size={22} className="text-[#2563EB] shrink-0" strokeWidth={2.4} />
                  <span>
                    Your details are 100% protected
                  </span>
                </p>
              </div>

              {error && (
                <p
                  data-testid="contact-error"
                  role="alert"
                  className="md:col-span-2 text-[13px] font-medium text-red-400 border-l-2 border-red-400/70 pl-3 py-1"
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <div className="md:col-span-2 flex justify-center pt-4">
                <button
                  type="submit"
                  data-testid="contact-submit-button"
                  disabled={isSubmitting}
                  className="inline-flex h-14 w-full sm:w-auto sm:min-w-[280px] items-center justify-center rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] px-10 text-[15px] font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
