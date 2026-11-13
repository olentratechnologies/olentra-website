import { Bot, Shield, Sparkles, Store } from 'lucide-react';

export const products = [
    {
        id: 'dailysupply',
        title: 'Daily Supply',
        seoTitle: 'Daily Supply | Connected Community Commerce',
        metaDescription: 'Daily Supply connects local stores, daily essentials vendors, and residential communities.',
        description: 'Connected community commerce for neighborhood stores, daily essentials vendors, and residents. In collaboration with VitaTech Solutions and BYP Capital.',
        icon: Store,
        emoji: '🛒',
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
        href: '/products/dailysupply',
        features: ['Smart POS & Offline Billing', 'Milk & Daily Subscriptions', 'Society Commerce Marketplace'],
        status: 'Active',
        price: 'Explore Daily Supply',
        image: '/Company names and product logo/DailySupply.jpeg',
        navLogo: {
            src: '/images/products/dailysupply/dailysupply-logo.png',
            width: 180,
            height: 180,
        }
    },
    {
        id: 'olenbot',
        title: 'Olenbot',
        seoTitle: 'Olenbot',
        metaDescription: 'Olenbot is an AI-powered outbound calling and lead intelligence platform for scalable conversion operations.',
        description: 'AI-powered outbound calling and lead intelligence platform that scrapes, queues, calls, and analyzes conversations to qualify leads at scale.',
        icon: Bot,
        emoji: '🤖',
        color: 'from-purple-500/20 to-pink-500/20 text-purple-400',
        href: '/products/olenbot',
        features: ['Automated Lead Collection', 'AI Call Engine', 'Real-Time Analytics'],
        status: 'In Development',
        price: 'Usage-Based',
        image: '/images/products/olen-bot.png',
        logo: {
            src: '/images/products/branding/olenbot-transparent.png',
            width: 1254,
            height: 1254,
        }
    },
    {
        id: 'studio',
        title: 'Olentra AI Studio',
        seoTitle: 'Olentra AI Studio',
        metaDescription: 'Olentra AI Studio is an AI video generator that turns a creative brief into publish-ready cinematic video.',
        description: 'An AI video generator that turns a creative brief into publish-ready cinematic video, with multi-model generation, consistent characters and products, and one-click social publishing.',
        icon: Sparkles,
        emoji: '✨',
        color: 'from-blue-500/20 to-indigo-500/20 text-blue-400',
        href: '/products/olentra-ai-studio',
        features: ['Multi-Model Video Generation', 'Character & Product Lock', 'One-Click Publishing'],
        status: 'In Development',
        price: 'Consult for Pricing',
        image: '/images/products/ai-studio.png',
        logo: {
            src: '/images/products/branding/olentra-ai-studio-film-transparent.png',
            width: 1254,
            height: 1254,
        }
    }
];

