export const navLinks = [
    { id: 'nav-home', label: 'Home', href: '/' },
    { id: 'nav-about', label: 'About', href: '/about' },
    { id: 'nav-services', label: 'Services', href: '/services', hasDropdown: true },
    { id: 'nav-products', label: 'Products', href: '/products' },
    { id: 'nav-careers', label: 'Careers', hasDropdown: true, children: [
        { id: 'nav-careers-intern', label: 'Intern', href: '/careers/intern' },
    ] },
    { id: 'nav-blogs', label: 'Blogs', href: '/blogs' },
];

export const footerLinks = {
    quickLinks: [
        { id: 'footer-home', label: 'Home', href: '/' },
        { id: 'footer-about', label: 'About', href: '/about' },
        { id: 'footer-founders', label: 'Founders', href: '/about#founders' },
        { id: 'footer-services', label: 'All Services', href: '/services' },
        { id: 'footer-products', label: 'Products', href: '/products' },
        { id: 'footer-blogs', label: 'Insights', href: '/blogs' },
        { id: 'footer-dashboard', label: 'Enterprise Hub', href: '/dashboard' },
        { id: 'footer-contact', label: 'Contact Us', href: '/#contact' },
    ],
};
