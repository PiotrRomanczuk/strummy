import { useTranslations } from 'next-intl';

import type { SearchItem } from './topbar-search.helpers';

export const SEARCH_LIST_ID = 'topbar-search-results';
export const searchOptionId = (index: number) => `topbar-search-option-${index}`;

type Props = {
  songs: SearchItem[];
  students: SearchItem[];
  lists: SearchItem[];
  all: SearchItem[];
  activeIndex: number;
  isEmpty: boolean;
  onActivate: (index: number) => void;
  onSelect: (href: string) => void;
};

export function TopbarSearchList(props: Props) {
  const { songs, students, lists, all, activeIndex, isEmpty, onActivate, onSelect } = props;
  const t = useTranslations('Topbar');
  const hasResults = songs.length + students.length > 0;

  const renderItem = (item: SearchItem) => {
    const index = all.indexOf(item);
    const isActive = index === activeIndex;
    return (
      <li key={item.key} id={searchOptionId(index)} role="option" aria-selected={isActive}>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onActivate(index)}
          onClick={() => onSelect(item.href)}
          className={`w-full px-3 py-2 text-left text-[13px] text-[var(--ink-2)] ${
            isActive ? 'bg-[var(--rule-2)]' : ''
          }`}
        >
          <span className="block truncate">{item.label}</span>
          {item.detail && (
            <span className="block truncate text-[11px] text-[var(--ink-4)]">{item.detail}</span>
          )}
        </button>
      </li>
    );
  };

  const renderGroup = (title: string, group: SearchItem[]) =>
    group.length > 0 && (
      <>
        <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] text-[var(--ink-4)]">
          {title}
        </li>
        {group.map(renderItem)}
      </>
    );

  return (
    <ul
      id={SEARCH_LIST_ID}
      role="listbox"
      className="absolute top-full right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] py-1 shadow-[var(--shadow-md)]"
    >
      {renderGroup(t('searchGroupSongs'), songs)}
      {renderGroup(t('searchGroupStudents'), students)}
      {isEmpty && (
        <li role="presentation" className="px-3 py-2 text-[13px] text-[var(--ink-3)]">
          {t('searchNoResults')}
        </li>
      )}
      {hasResults && <li role="presentation" className="my-1 border-t border-[var(--rule)]" />}
      {lists.map(renderItem)}
    </ul>
  );
}
