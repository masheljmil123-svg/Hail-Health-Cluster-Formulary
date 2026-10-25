import { Link } from 'react-router-dom';
import { site } from '@/config/site';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-8 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-navy">
            {site.hospitalName} · {site.platformName}
          </p>
          <p className="mt-1">{site.organizationName}</p>
          <p className="mt-2 max-w-xl leading-6">
            Only administrator-approved and published content appears publicly.
          </p>
        </div>
        <div className="flex gap-5">
          <Link to="/about" className="hover:text-primary">
            About
          </Link>
          <Link to="/resources" className="hover:text-primary">
            Resources
          </Link>
          <Link to="/help" className="hover:text-primary">
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
}
