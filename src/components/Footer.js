"use client";

import { ArrowUpRight, Mail, Phone, MapPin, MessageSquare, Linkedin, Twitter, Instagram, MessageCircle } from 'lucide-react';
import Image from 'next/image';

import { serviceGroups } from '../data/services';
import { footerLinks } from '../data/navigation';
import { contactInfo } from '../data/contact';

const quickLinks = footerLinks.quickLinks;
const socialIcons = {
  LinkedIn: Linkedin,
  Twitter: Twitter,
  Instagram: Instagram,
  WhatsApp: MessageCircle,
};

export default function Footer() {
  const slugify = (value) =>
    value
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  return (
    <footer data-testid="footer" className="bg-[#020617] text-white border-t border-white/5 relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-cyber-grid bg-[length:30px_30px] opacity-[0.05] dark:opacity-10 pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-10 md:pb-14 relative z-10">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                <Image
                  src="/images/Logo/Olentra-Logo-Without-Background.png"
                  alt="Olentra Logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter italic">
                Olentra <span className="text-primary italic">Technologies</span>
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xs">
              Digital marketing & technology agency for businesses across Telangana & Andhra Pradesh. Telugu & English support.
            </p>
          </div>

          {/* Services Column */}
          <div className="space-y-4">
            <h4 className="text-[10px] text-primary font-bold tracking-[0.3em] uppercase">Services</h4>
            <div className="flex flex-col gap-2">
              {serviceGroups.map((group) => (
                <a
                  key={group.category}
                  href={`#services-${slugify(group.category)}`}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-px bg-primary transition-all duration-300" />
                  {group.category}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-4">
            <h4 className="text-[10px] text-primary font-bold tracking-[0.3em] uppercase">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-px bg-primary transition-all duration-300" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact Column */}
          <div className="space-y-4">
            <h4 className="text-[10px] text-primary font-bold tracking-[0.3em] uppercase">Contact</h4>
            <div className="space-y-3">
              <a href={contactInfo.phoneFull} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
                <Phone className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary" />
                {contactInfo.phone}
              </a>
              <a href={contactInfo.emailFull} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group">
                <Mail className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary" />
                {contactInfo.email}
              </a>
              <div className="flex items-start gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-primary/50 shrink-0 mt-0.5" />
                <span>
                  {contactInfo.addresses.map((addr) => (
                    <span key={addr.label}>
                      {addr.value}<br />
                    </span>
                  ))}
                </span>
              </div>


              <div className="pt-2">
                <a
                  href="#contact"
                  className="group relative inline-flex items-center gap-2.5 px-5 py-2.5 text-[11px] font-black text-white bg-primary uppercase tracking-widest overflow-hidden transition-all hover:scale-105"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
                >
                  <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center gap-2">
                    Get Free Consultation
                    <MessageSquare className="w-2.5 h-2.5" />
                  </span>
                </a>
              </div>

              <div className="pt-3">
                <div className="flex items-center gap-3">
                  {contactInfo.socials.map((social) => {
                    const Icon = socialIcons[social.label];
                    if (!Icon || !social.href) return null;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        aria-label={social.label}
                        target={social.href.startsWith('http') ? '_blank' : undefined}
                        rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 inline-flex items-center justify-center text-white/70 hover:text-white hover:border-primary/50 hover:shadow-[0_0_12px_rgba(37,99,235,0.35)] transition-all"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Very bottom branding */}
        <div className="pt-6 border-t border-border/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase">
          <p>© {new Date().getFullYear()} OLENTRA LTD. ALL PROTOCOLS RESERVED.</p>
          <div className="flex items-center gap-6">
            <p className="flex items-center gap-2">ENGINE_VERSION: <span className="text-primary/60">3.2.0</span></p>
            <p className="flex items-center gap-2">LOC: <span className="text-primary/60">IN_TS_AP</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
