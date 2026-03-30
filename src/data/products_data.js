import { Bot, Shield, Sparkles } from 'lucide-react';

export const products = [
    {
        id: 'studio',
        title: 'Olentra AI Studio',
        description: 'A full-stack AI product studio for turning prompts into production apps with multi-agent orchestration, secure auth, and scalable deployment pipelines.',
        icon: Sparkles,
        href: '/products/olentra-ai-studio',
        features: ['Multi-Agent Orchestration', 'Next.js App Builder', 'Enterprise-Grade Security'],
        status: 'Flagship',
        price: 'Consult for Pricing',
        image: '/images/products/ai-studio.png'
    },
    {
        id: 'olenbot',
        title: 'Olenbot',
        description: 'AI-powered outbound calling and lead intelligence platform that scrapes, queues, calls, and analyzes conversations to qualify leads at scale.',
        icon: Bot,
        href: '/products/olenbot',
        features: ['Automated Lead Collection', 'AI Call Engine', 'Real-Time Analytics'],
        status: 'In Pilot',
        price: 'Usage-Based',
        image: '/images/products/olen-bot.png'
    },
    {
        id: 'sentinel',
        title: 'SentinelGuard Security Bot',
        description: 'AI security automation that monitors infrastructure for anomalies, vulnerabilities, and real-time threats with guided remediation workflows.',
        icon: Shield,
        href: '#products',
        features: ['Threat Detection', 'Zero-Day Vulnerability Scanning', 'Auto-Remediation'],
        status: 'Beta',
        price: 'Contact Sales',
        image: '/images/products/robot-hero.png'
    }
];
