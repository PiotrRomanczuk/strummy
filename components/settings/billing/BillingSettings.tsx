import type {
  BillingSettings as BillingSettingsValues,
  LessonPackage,
} from '@/lib/services/billing/billing-queries';

import { BillingSettingsPackages } from './BillingSettings.Packages';
import { BillingSettingsTerms } from './BillingSettings.Terms';

type Props = {
  packages: LessonPackage[];
  settings: BillingSettingsValues;
};

/** Settings · Payments tab: the price list, then the rules lessons are counted by. */
export const BillingSettings = ({ packages, settings }: Props) => (
  <div className="flex max-w-3xl flex-col gap-6">
    <BillingSettingsPackages packages={packages} />
    <BillingSettingsTerms settings={settings} />
  </div>
);
