import {
    Building2,
    Activity,
    Brain,
    Database,
    Layers3,
    BarChart3,
    Cpu,
    Gauge,
    Wallet,
    LayoutGrid,
    Search,
    Wrench,
    FileText,
    LineChart,
    Palette,
    Video,
    BadgeCheck,
    Megaphone,
    Users,
    Filter,
    Mail,
    CloudCog,
    ShieldCheck,
    Repeat,
    ShoppingCart,
    Code2,
    Smartphone,
} from 'lucide-react';

export const serviceGroups = [
    {
        category: 'Platform Engineering',
        icon: '🧩',
        services: [
            {
                title: 'Backend & APIs',
                description:
                    'Designing scalable backend systems with robust APIs and seamless third-party integrations—built for security and performance.',
                tags: ['Scalable', 'APIs', 'Integrations', 'Backend'],
                Icon: Building2,
                href: '#services',
            },
            {
                title: 'Real-Time Systems',
                description:
                    'Building systems capable of handling real-time data and high-throughput backend operations.',
                tags: ['Realtime', 'Streaming', 'Scale'],
                Icon: Activity,
                href: '#services',
            },
            {
                title: 'Developer Platforms',
                description:
                    'Building internal platforms, reusable components, and developer workflows that speed up delivery and improve reliability.',
                tags: ['Automation', 'Workflows', 'Developer Experience'],
                Icon: Layers3,
                href: '#services',
            },
            {
                title: 'Workflow Automation',
                description:
                    'Automating workflows and operational systems to improve efficiency and reduce manual effort.',
                tags: ['Automation', 'Workflows'],
                Icon: Repeat,
                href: '#services',
            },
        ],
    },
    {
        category: 'Data & AI',
        icon: '🤖',
        services: [
            {
                title: 'AI Solutions',
                description:
                    'Building AI-powered platforms using LLMs, embeddings, and modern AI frameworks.',
                tags: ['AI', 'LLM', 'Automation'],
                Icon: Brain,
                href: '#services',
            },
            {
                title: 'Data Engineering',
                description:
                    'Designing robust data pipelines and ETL workflows for scalable data processing.',
                tags: ['ETL', 'Data Pipelines', 'Analytics'],
                Icon: Database,
                href: '#services',
            },
            {
                title: 'Data Analytics',
                description:
                    'Turning product and operational data into dashboards, metrics, and decision-ready insights.',
                tags: ['Analytics', 'Data Pipelines'],
                Icon: BarChart3,
                href: '#services',
            },
            {
                title: 'MLOps',
                description:
                    'Operationalizing AI with reliable model packaging, deployment workflows, and production monitoring.',
                tags: ['AI', 'Automation', 'MLOps'],
                Icon: Cpu,
                href: '#services',
            },
        ],
    },
    {
        category: 'Cloud & Security',
        icon: '☁️',
        services: [
            {
                title: 'Cloud Architecture',
                description:
                    'Designing high-availability cloud infrastructure with CI/CD automation and multi-cloud cost optimization.',
                tags: ['AWS', 'GCP', 'Azure', 'Docker', 'CI/CD'],
                Icon: CloudCog,
                href: '#services',
            },
            {
                title: 'Security & Compliance',
                description:
                    'Enterprise-grade security systems with robust identity management (Auth) and compliance frameworks.',
                tags: ['Security', 'Auth', 'Compliance'],
                Icon: ShieldCheck,
                href: '#services',
            },
        ],
    },
    {
        category: 'Product Engineering',
        icon: '🧑‍💻',
        services: [
            {
                title: 'Web Applications',
                description:
                    'Custom web applications that seamlessly blend intuitive frontend experiences with powerful backend infrastructure—built to scale with your business.',
                tags: ['Web Applications', 'API Architecture', 'Scalable Systems', 'Performance'],
                Icon: Code2,
                href: '#services',
            },
            {
                title: 'Mobile Apps',
                description:
                    'Developing scalable mobile apps with smooth performance and intuitive UX.',
                tags: ['iOS', 'Android'],
                Icon: Smartphone,
                href: '#services',
            },
            {
                title: 'Commerce Solutions',
                description:
                    'Developing scalable e-commerce and multi-vendor platforms.',
                tags: ['E-Commerce', 'Marketplace'],
                Icon: ShoppingCart,
                href: '#services',
            },
            {
                title: 'UI & Design Systems',
                description:
                    'Building consistent, accessible UI components and design systems that scale across product surfaces.',
                tags: ['Web Applications', 'Performance', 'Design Systems'],
                Icon: LayoutGrid,
                href: '#services',
            },
        ],
    },
    {
        category: 'SEO & Organic Growth',
        icon: '📈',
        services: [
            {
                title: 'Search Optimization',
                description:
                    'Improving crawlability, indexation, and on-page performance to reliably discover and rank your pages.',
                tags: ['Technical SEO', 'On-Page SEO', 'Performance'],
                Icon: Search,
                href: '#services',
            },
            {
                title: 'Strategy & Performance',
                description:
                    'Planning conversion-focused content strategy and tracking impact with clear performance insights.',
                tags: ['Content Strategy', 'Analytics', 'Keywords'],
                Icon: LineChart,
                href: '#services',
            },
        ],
    },
    {
        category: 'Branding & Creative',
        icon: '🎨',
        services: [
            {
                title: 'Brand Strategy',
                description:
                    'Defining unique brand identities and market positioning that align visuals with core business messaging.',
                tags: ['Identity', 'Branding', 'Positioning', 'Voice'],
                Icon: BadgeCheck,
                href: '#services',
            },
            {
                title: 'Creative Production',
                description:
                    'Producing high-impact visual assets, motion graphics, and product media to elevate storytelling.',
                tags: ['Design', 'Motion', 'Video', 'Photos'],
                Icon: Palette,
                href: '#services',
            },
        ],
    },
    {
        category: 'Sales Growth',
        icon: '💼',
        services: [
            {
                title: 'Acquisition & Lead Gen',
                description:
                    'Launching acquisition campaigns and building funnels that convert intent into qualified leads.',
                tags: ['Paid Ads', 'Lead Gen', 'Funnels'],
                Icon: Megaphone,
                href: '#services',
            },
            {
                title: 'Lifecycle & CRM Ops',
                description:
                    'Optimizing lifecycle marketing and sales operations through CRM automation and personalized messaging.',
                tags: ['Email/SMS', 'Automation', 'Sales Ops'],
                Icon: Mail,
                href: '#services',
            },
        ],
    },
];

export const services = serviceGroups.flatMap(group => group.services);
