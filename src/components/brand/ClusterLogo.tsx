import { useState } from 'react';
import { site } from '@/config/site';
import { siteAssets } from '@/config/siteAssets';
import { cn } from '@/lib/cn';

export function ClusterLogo({ className = 'h-12 w-auto' }: { className?: string }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className={cn('leading-tight', className)}>
        <p className="font-serif text-[15px] font-semibold text-teal" lang="ar" dir="rtl">
          {site.organizationNameAr}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-navy">{site.organizationName}</p>
      </div>
    );
  }

  return (
    <img
      src={siteAssets.hailHealthClusterLogo}
      alt={site.organizationName}
      className={cn('w-auto object-contain', className)}
      onError={() => setMissing(true)}
    />
  );
}
