'use client';

import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n/client';

export interface TermEntry {
  id: string;
  wikidata: string;
  'zh-cn': string;
  'zh-hant': string;
  ja: string;
  en: string;
  es: string;
  source: string;
  aliases: string;
  avoid: string;
  disputed: string;
  notes: string;
}

interface Props {
  data: string;
  lang: string;
}

const LANG_ORDER = ['zh-cn', 'zh-hant', 'ja', 'en', 'es'] as const;
type LangCode = (typeof LANG_ORDER)[number];

const LANG_LABELS: Record<LangCode, string> = {
  'zh-cn': '中文（简）',
  'zh-hant': '中文（繁）',
  ja: '日本語',
  en: 'English',
  es: 'Español',
};

function parseTsv(raw: string): TermEntry[] {
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(
      headers.map((h, i) => [h, cells[i] ?? '']),
    ) as unknown as TermEntry;
  });
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-warning/40 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchableTerminologyTable({ data, lang }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const entries = useMemo(() => parseTsv(data), [data]);

  const langOrder = useMemo<LangCode[]>(() => {
    const cur = lang as LangCode;
    if (!LANG_ORDER.includes(cur)) return [...LANG_ORDER];
    return [cur, ...LANG_ORDER.filter((l) => l !== cur)];
  }, [lang]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [
        e['zh-cn'],
        e['zh-hant'],
        e.ja,
        e.en,
        e.es,
        e.source,
        e.aliases,
        e.notes,
      ].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasDetails = (e: TermEntry) =>
    e.source || e.aliases || e.avoid || e.disputed || e.notes;

  const countText = t('terminology-count', lang)
    .replace('{shown}', String(filtered.length))
    .replace('{total}', String(entries.length));

  return (
    <div className="my-6 not-prose">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          className="input input-bordered input-sm flex-1 max-w-sm"
          placeholder={t('terminology-search', lang)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('terminology-search', lang)}
        />
        <span className="text-sm text-base-content/60 self-center">
          {countText}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-xs table-pin-rows w-full">
          <thead>
            <tr className="bg-base-200">
              {langOrder.map((l) => (
                <th
                  key={l}
                  className={l === lang ? 'font-bold text-primary' : ''}
                >
                  {LANG_LABELS[l]}
                </th>
              ))}
              <th className="w-6" aria-label="details" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={langOrder.length + 1}
                  className="text-center text-base-content/50 py-8"
                >
                  {t('terminology-no-results', lang)}
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const isOpen = expanded.has(entry.id);
                return (
                  <>
                    <tr
                      key={entry.id}
                      className="hover:bg-base-200/50 cursor-pointer"
                      onClick={() =>
                        hasDetails(entry) && toggleExpand(entry.id)
                      }
                      aria-expanded={hasDetails(entry) ? isOpen : undefined}
                    >
                      {langOrder.map((l) => (
                        <td
                          key={l}
                          className={
                            l === lang ? 'font-medium' : 'text-base-content/70'
                          }
                        >
                          {highlight(entry[l], query) || (
                            <span className="text-base-content/30">—</span>
                          )}
                        </td>
                      ))}
                      <td className="text-right">
                        {hasDetails(entry) && (
                          <span
                            className={`inline-block transition-transform duration-150 text-base-content/40 ${isOpen ? 'rotate-90' : ''}`}
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        )}
                      </td>
                    </tr>
                    {isOpen && hasDetails(entry) && (
                      <tr key={`${entry.id}-detail`} className="bg-base-100">
                        <td
                          colSpan={langOrder.length + 1}
                          className="px-4 py-3"
                        >
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {entry.source && (
                              <>
                                <dt className="font-semibold text-base-content/60">
                                  {t('terminology-source', lang)}
                                </dt>
                                <dd>{highlight(entry.source, query)}</dd>
                              </>
                            )}
                            {entry.aliases && (
                              <>
                                <dt className="font-semibold text-base-content/60">
                                  {t('terminology-aliases', lang)}
                                </dt>
                                <dd>
                                  {highlight(
                                    entry.aliases.replace(/\//g, ' / '),
                                    query,
                                  )}
                                </dd>
                              </>
                            )}
                            {entry.avoid && (
                              <>
                                <dt className="font-semibold text-error/80">
                                  {t('terminology-avoid', lang)}
                                </dt>
                                <dd className="text-error/70">
                                  {entry.avoid.replace(/\//g, ' / ')}
                                </dd>
                              </>
                            )}
                            {entry.disputed && (
                              <>
                                <dt className="font-semibold text-warning/80">
                                  {t('terminology-disputed', lang)}
                                </dt>
                                <dd className="text-warning/70">
                                  {entry.disputed.replace(/\//g, ' / ')}
                                </dd>
                              </>
                            )}
                            {entry.notes && (
                              <>
                                <dt className="font-semibold text-base-content/60 sm:col-span-2">
                                  {t('terminology-notes', lang)}
                                </dt>
                                <dd className="sm:col-span-2 text-base-content/80">
                                  {entry.notes}
                                </dd>
                              </>
                            )}
                            {entry.wikidata && (
                              <>
                                <dt className="font-semibold text-base-content/60">
                                  Wikidata
                                </dt>
                                <dd>
                                  <a
                                    href={`https://www.wikidata.org/wiki/${entry.wikidata}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link link-primary text-xs"
                                    onClick={(ev) => ev.stopPropagation()}
                                  >
                                    {entry.wikidata}
                                  </a>
                                </dd>
                              </>
                            )}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
