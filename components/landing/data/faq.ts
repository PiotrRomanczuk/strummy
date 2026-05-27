export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: 'Is my student data private?',
    answer:
      "Yes. Your student information and lesson notes stay encrypted and never leave your account. We don't sell data or use it to train AI. You own everything you create in Strummy.",
  },
  {
    question: 'Can I import my existing notes?',
    answer:
      "You can manually add students and songs to Strummy, or we can help you migrate from spreadsheets. It takes an afternoon for most teachers. We're working on direct imports too.",
  },
  {
    question: 'Do my students need an account?',
    answer:
      "No. Students and parents get a simple link to view their progress, tabs, and practice schedules. They don't need to sign up or remember a password. You control what they see.",
  },
  {
    question: 'What if I only teach a few students?',
    answer:
      "Strummy's free plan covers up to ten students. It includes basic lesson planning and song tracking. You can stay on it forever, or upgrade when your studio grows.",
  },
  {
    question: 'How much does support cost?',
    answer:
      "Support is included with every plan. Email us and we'll get back to you within a day. Pro and Studio plans get priority support and direct access to our team.",
  },
];
