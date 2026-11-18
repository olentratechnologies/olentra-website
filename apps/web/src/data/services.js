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

const slugify = (value) =>
    value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export const serviceGroups = [
    {
        category: 'Platform Engineering',
        Icon: Layers3,
        icon: '🧩',
        services: [
            {
                title: 'Backend & APIs',
                description:
                    'Designing scalable backend systems with robust APIs and seamless third-party integrations—built for security and performance.',
                tags: ['Scalable', 'APIs', 'Integrations', 'Backend'],
                Icon: Building2,
                href: `#services-${slugify('Backend & APIs')}`,
            },
            {
                title: 'Real-Time Systems',
                description:
                    'Building systems capable of handling real-time data and high-throughput backend operations.',
                tags: ['Realtime', 'Streaming', 'Scale'],
                Icon: Activity,
                href: `#services-${slugify('Real-Time Systems')}`,
            },
            {
                title: 'Developer Platforms',
                description:
                    'Building internal platforms, reusable components, and developer workflows that speed up delivery and improve reliability.',
                tags: ['Automation', 'Workflows', 'Developer Experience'],
                Icon: Layers3,
                href: `#services-${slugify('Developer Platforms')}`,
            },
            {
                title: 'Workflow Automation',
                description:
                    'Automating workflows and operational systems to improve efficiency and reduce manual effort.',
                tags: ['Automation', 'Workflows'],
                Icon: Repeat,
                href: `#services-${slugify('Workflow Automation')}`,
            },
        ],
    },
    {
        category: 'Data & AI',
        Icon: Brain,
        icon: '🤖',
        services: [
            {
                title: 'AI Solutions',
                description:
                    'Building AI-powered platforms using LLMs, embeddings, and modern AI frameworks.',
                tags: ['AI', 'LLM', 'Automation'],
                Icon: Brain,
                href: `#services-${slugify('AI Solutions')}`,
            },
            {
                title: 'Data Engineering',
                description:
                    'Designing robust data pipelines and ETL workflows for scalable data processing.',
                tags: ['ETL', 'Data Pipelines', 'Analytics'],
                Icon: Database,
                href: `#services-${slugify('Data Engineering')}`,
            },
            {
                title: 'Data Analytics',
                description:
                    'Turning product and operational data into dashboards, metrics, and decision-ready insights.',
                tags: ['Analytics', 'Data Pipelines'],
                Icon: BarChart3,
                href: `#services-${slugify('Data Analytics')}`,
            },
            {
                title: 'MLOps',
                description:
                    'Operationalizing AI with reliable model packaging, deployment workflows, and production monitoring.',
                tags: ['AI', 'Automation', 'MLOps'],
                Icon: Cpu,
                href: `#services-${slugify('MLOps')}`,
            },
        ],
    },
    {
        category: 'Cloud & Security',
        Icon: ShieldCheck,
        icon: '☁️',
        services: [
            {
                title: 'Cloud Architecture',
                description:
                    'Designing high-availability cloud infrastructure with CI/CD automation and multi-cloud cost optimization.',
                tags: ['AWS', 'GCP', 'Azure', 'Docker', 'CI/CD'],
                Icon: CloudCog,
                href: `#services-${slugify('Cloud Architecture')}`,
            },
            {
                title: 'Security & Compliance',
                description:
                    'Enterprise-grade security systems with robust identity management (Auth) and compliance frameworks.',
                tags: ['Security', 'Auth', 'Compliance'],
                Icon: ShieldCheck,
                href: `#services-${slugify('Security & Compliance')}`,
            },
        ],
    },
    {
        category: 'Product Engineering',
        Icon: Code2,
        icon: '🧑‍💻',
        services: [
            {
                title: 'Web Applications',
                description:
                    'Custom web applications that seamlessly blend intuitive frontend experiences with powerful backend infrastructure—built to scale with your business.',
                tags: ['Web Applications', 'API Architecture', 'Scalable Systems', 'Performance'],
                Icon: Code2,
                href: `#services-${slugify('Web Applications')}`,
            },
            {
                title: 'Mobile Apps',
                description:
                    'Developing scalable mobile apps with smooth performance and intuitive UX.',
                tags: ['iOS', 'Android'],
                Icon: Smartphone,
                href: `#services-${slugify('Mobile Apps')}`,
            },
            {
                title: 'Commerce Solutions',
                description:
                    'Developing scalable e-commerce and multi-vendor platforms.',
                tags: ['E-Commerce', 'Marketplace'],
                Icon: ShoppingCart,
                href: `#services-${slugify('Commerce Solutions')}`,
            },
            {
                title: 'UI & Design Systems',
                description:
                    'Building consistent, accessible UI components and design systems that scale across product surfaces.',
                tags: ['Web Applications', 'Performance', 'Design Systems'],
                Icon: LayoutGrid,
                href: `#services-${slugify('UI & Design Systems')}`,
            },
        ],
    },
    {
        category: 'SEO & Organic Growth',
        Icon: LineChart,
        icon: '📈',
        services: [
            {
                title: 'Search Optimization',
                description:
                    'Improving crawlability, indexation, and on-page performance to reliably discover and rank your pages.',
                tags: ['Technical SEO', 'On-Page SEO', 'Performance'],
                Icon: Search,
                href: `#services-${slugify('Search Optimization')}`,
            },
            {
                title: 'Strategy & Performance',
                description:
                    'Planning conversion-focused content strategy and tracking impact with clear performance insights.',
                tags: ['Content Strategy', 'Analytics', 'Keywords'],
                Icon: LineChart,
                href: `#services-${slugify('Strategy & Performance')}`,
            },
        ],
    },
    {
        category: 'Branding & Creative',
        Icon: Palette,
        icon: '🎨',
        services: [
            {
                title: 'Brand Strategy',
                description:
                    'Defining unique brand identities and market positioning that align visuals with core business messaging.',
                tags: ['Identity', 'Branding', 'Positioning', 'Voice'],
                Icon: BadgeCheck,
                href: `#services-${slugify('Brand Strategy')}`,
            },
            {
                title: 'Creative Production',
                description:
                    'Producing high-impact visual assets, motion graphics, and product media to elevate storytelling.',
                tags: ['Design', 'Motion', 'Video', 'Photos'],
                Icon: Palette,
                href: `#services-${slugify('Creative Production')}`,
            },
        ],
    },
    {
        category: 'Sales Growth',
        Icon: Megaphone,
        icon: '💼',
        services: [
            {
                title: 'Acquisition & Lead Gen',
                description:
                    'Launching acquisition campaigns and building funnels that convert intent into qualified leads.',
                tags: ['Paid Ads', 'Lead Gen', 'Funnels'],
                Icon: Megaphone,
                href: `#services-${slugify('Acquisition & Lead Gen')}`,
            },
            {
                title: 'Lifecycle & CRM Ops',
                description:
                    'Optimizing lifecycle marketing and sales operations through CRM automation and personalized messaging.',
                tags: ['Email/SMS', 'Automation', 'Sales Ops'],
                Icon: Mail,
                href: `#services-${slugify('Lifecycle & CRM Ops')}`,
            },
        ],
    },
];

export const services = serviceGroups.flatMap(group => group.services);
