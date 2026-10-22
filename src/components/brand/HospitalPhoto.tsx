import { useState } from 'react';
import { site } from '@/config/site';
import { siteAssets } from '@/config/siteAssets';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'alternative';

const sources: Record<Variant, string> = {
  primary: siteAssets.hospitalExteriorPrimary,
  alternative: siteAssets.hospitalExteriorAlternative,
};

export function HospitalPhoto({
  variant,
  className,
  alt = `${site.hospitalName} exterior`,
  decorative = false,
}: {
  variant: Variant;
  className?: string;
  alt?: string;
  decorative?: boolean;
}) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div
        className={cn('bg-gradient-to-br from-[#8eb6d8] via-[#d5e8f6] to-[#eaf4fc]', className)}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
      />
    );
  }

  return (
    <img
      src={sources[variant]}
      alt={decorative ? '' : alt}
      className={className}
      onError={() => setMissing(true)}
    />
  );
}
