import { CustomSection, FeatureGrid, TrendingPanel, UpdatesPanel } from '@/components/home/HomePanels';
import { HeroSearch } from '@/components/search/HeroSearch';
import { site } from '@/config/site';
import { useContent } from '@/hooks/useContent';
import { publicUpdates } from '@/services/library';
import type { HomepageSection } from '@/types';

export function HomePage() {
  const { state } = useContent();
  const sections = [...state.sections].sort((a, b) => a.order - b.order);
  const hero = sections.find((section) => section.kind === 'hero');
  const features = sections.filter((section) => section.kind === 'feature' && section.visible);
  const lower = sections.filter((section) => section.kind !== 'hero' && section.kind !== 'feature' && section.visible);
  const updates = publicUpdates(state).slice(0, 4);

  return (
    <div>
      <HeroSearch
        density="home"
        showIntro={hero?.visible !== false}
        subtitle={hero?.description || site.tagline}
        placeholder={hero?.searchPlaceholder || site.searchPlaceholder}
        popular={hero?.visible === false ? [] : hero?.popularSearches ?? []}
      />

      <div className="relative z-10 mx-auto -mt-16 max-w-page space-y-5 px-4 sm:px-6">
        <FeatureGrid sections={features} />
        {chunkLower(lower).map((row) => (
          <div key={row.map((section) => section.id).join('-')} className={row.length > 1 ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : 'min-w-0'}>
            {row.map((section) => {
              if (section.kind === 'updates') return <UpdatesPanel key={section.id} section={section} items={updates} />;
              if (section.kind === 'trending') return <TrendingPanel key={section.id} section={section} counts={state.searchCounts} />;
              return <CustomSection key={section.id} section={section} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function chunkLower(items: HomepageSection[]): HomepageSection[][] {
  const rows: HomepageSection[][] = [];
  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const next = items[index + 1];
    const pairable =
      next &&
      ((current.kind === 'updates' && next.kind === 'trending') || (current.kind === 'trending' && next.kind === 'updates'));
    if (pairable && next) {
      rows.push([current, next]);
      index += 1;
    } else {
      rows.push([current]);
    }
  }
  return rows;
}
