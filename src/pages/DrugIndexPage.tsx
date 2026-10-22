import { Link } from 'react-router-dom';
import { useContent } from '@/hooks/useContent';
import { publishedDrugs } from '@/services/search';

export function DrugIndexPage() {
  const { state } = useContent();
  const drugs = publishedDrugs(state.drugs).sort((a, b) => a.genericName.localeCompare(b.genericName));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const grouped = letters
    .map((letter) => ({
      letter,
      items: drugs.filter((drug) => drug.genericName.toUpperCase().startsWith(letter)),
    }))
    .filter((group) => group.items.length);

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-primary">Drug Index A–Z</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">Formulary medications</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Published demonstration records, listed alphabetically. These entries are not approved for clinical use.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {letters.map((letter) => {
          const enabled = grouped.some((group) => group.letter === letter);
          return enabled ? (
            <a key={letter} href={`#letter-${letter}`} className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-navy shadow-sm hover:bg-clinical">
              {letter}
            </a>
          ) : (
            <span key={letter} className="grid h-9 w-9 place-items-center rounded-full text-sm text-slate-300">
              {letter}
            </span>
          );
        })}
      </div>
      <div className="mt-8 space-y-8">
        {grouped.map((group) => (
          <section key={group.letter} id={`letter-${group.letter}`} className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-navy">{group.letter}</h2>
            <ul className="mt-3 divide-y divide-line rounded-3xl bg-white px-5 shadow-card">
              {group.items.map((drug) => (
                <li key={drug.id}>
                  <Link to={`/drugs/${drug.id}`} className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-primary">
                    <span>
                      <span className="block font-medium text-navy">{drug.genericName}</span>
                      <span className="text-sm text-muted">{drug.therapeuticClass}</span>
                    </span>
                    <span className="text-sm text-primary">View details</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {grouped.length === 0 && <p className="text-muted">No published medications are available.</p>}
      </div>
    </div>
  );
}
