import { Bot, Cpu, Zap, Shield, Sparkles } from 'lucide-react';

export const products = [
    {
        id: '1',
        title: 'CoreAI Agent Builder',
        description: 'An enterprise-grade platform for deploying autonomous AI agents that handle customer operations, data synthesis, and complex decision-making with sub-second latency.',
        icon: Bot,
        href: '#products',
        features: ['Autonomous Reasoning', 'Multi-Language Support', 'Third-Party App Integrations'],
        status: 'Stable',
        price: 'Starts at $249/mo'
    },
    {
        id: '2',
        title: 'SentinelGuard Security Bot',
        description: 'Advanced AI-driven security automation that monitors infrastructure for anomalies, vulnerabilities, and real-time threats, providing automated remediation without manual intervention.',
        icon: Shield,
        href: '#products',
        features: ['Threat Detection', 'Zero-Day Vulnerability Scanning', 'Auto-Remediation'],
        status: 'Beta',
        price: 'Contact Sales'
    },
    {
        id: '3',
        title: 'NeuralPipe Data Orchestrator',
        description: 'The world\'s fastest AI data pipeline. Build, test, and deploy large-scale ML data workflows using an intuitive visual interface or high-performance CLI.',
        icon: Cpu,
        href: '#products',
        features: ['Visual Flow Editor', 'GPU Accelerated Processing', 'One-Click ML Deployment'],
        status: 'Early Access',
        price: 'Starts at $499/mo'
    }
];
