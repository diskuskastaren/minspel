"use client";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { SearchHit } from "@/game-engine/oronmask-api-types";
import { api } from "./api";
import s from "./oronmask.module.css";

type Props = {
  selected: SearchHit | null;
  onSelect: (hit: SearchHit | null) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export type SearchBoxHandle = { focus: () => void };

export const SearchBox = forwardRef<SearchBoxHandle, Props>(function SearchBox({ selected, onSelect, onSubmit, disabled }, ref) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  useEffect(() => {
    const q = query.trim();
    if (selected || q.length < 1) {
      setHits([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      api
        .search(q, ctrl.signal)
        .then((h) => {
          setHits(h);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, selected]);

  function choose(hit: SearchHit) {
    onSelect(hit);
    setQuery("");
    setOpen(false);
    setHits([]);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && hits[active]) choose(hits[active]);
      else if (selected) onSubmit();
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && selected) {
      onSelect(null);
    }
  }

  const showList = open && !selected && query.trim().length > 0;

  return (
    <div className={s.search}>
      {showList && (
        <ul id={listId} role="listbox" className={s.suggestions} aria-label="Förslag">
          {hits.length === 0 && !loading && <li className={s.suggestionEmpty}>Inga träffar – prova artistens namn</li>}
          {hits.map((h, i) => (
            <li
              key={h.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${s.suggestion} ${i === active ? s.suggestionActive : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(h)}
            >
              <span className={s.suggestionTitle}>{h.title}</span>
              <span className={s.suggestionArtist}>{h.artist}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={`${s.searchField} ${selected ? s.searchFieldSelected : ""}`}>
        <svg className={s.searchIcon} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          {selected ? (
            <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          ) : (
            <path d="m20 20-4.2-4.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        <input
          ref={inputRef}
          className={s.searchInput}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
          aria-label="Sök låt eller artist"
          placeholder={selected ? "" : "Sök låt eller artist…"}
          value={selected ? `${selected.title} – ${selected.artist}` : query}
          readOnly={!!selected}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint={selected ? "send" : "search"}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {loading && !selected && <span className={s.spinner} aria-hidden="true" />}
        {selected && (
          <button type="button" className={s.clear} onClick={() => { onSelect(null); inputRef.current?.focus(); }} aria-label="Rensa valet">
            ✕
          </button>
        )}
      </div>
    </div>
  );
});
