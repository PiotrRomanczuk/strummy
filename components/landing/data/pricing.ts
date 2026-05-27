export type PricingTier = {
  name: string;
  description: string;
  price: string;
  period: string;
  cta: { label: string; href: string };
  features: string[];
  highlighted?: boolean;
};

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    description: 'Perfect for solo teachers',
    price: 'Free',
    period: 'Forever',
    cta: { label: 'Start now', href: '/sign-up' },
    features: ['Up to 10 students', 'Basic lesson planning', 'Song progress tracking'],
  },
  {
    name: 'Pro',
    description: 'For growing studios',
    price: '$19',
    period: 'per month',
    cta: { label: 'Start free', href: '/sign-up?plan=pro' },
    features: [
      'Up to 50 students',
      'AI lesson plan generation',
      'Parent progress visibility',
      'Tab and chord sharing',
    ],
    highlighted: true,
  },
  {
    name: 'Studio',
    description: 'For established studios',
    price: '$39',
    period: 'per month',
    cta: { label: 'Start free', href: '/sign-up?plan=studio' },
    features: [
      'Unlimited students',
      'Advanced reporting',
      'Attendance tracking',
      'Invoice management',
      'Priority support',
    ],
  },
];
