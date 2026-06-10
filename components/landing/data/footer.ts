export type FooterColumn = {
  heading: string;
  links: { label: string; href: string }[];
};

export const footerColumns: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#capabilities' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Security', href: '/#faq' },
      { label: 'Updates', href: '/changelog' },
      { label: 'Company', href: '/about' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Community', href: '/community' },
      { label: 'Connect', href: '/connect' },
    ],
  },
];

export const footerSocial = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'X', href: 'https://x.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
];
