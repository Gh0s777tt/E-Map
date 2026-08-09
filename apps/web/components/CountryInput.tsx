"use client";

/**
 * [#375] Pole „Kraj" z podpowiedziami kodów ISO 3166-1 alpha-2.
 *
 * Świadomie `input` + `datalist`, a nie `select`. Kierowca, który wie, że tankuje
 * w Niemczech, wpisuje „DE" szybciej niż znajdzie Niemcy na liście czterdziestu
 * pozycji — a osoba, która nie zna kodu, dostaje listę z nazwami. Wpisanie
 * „Niemcy" też przejdzie: schemat (`geoLocationSchema`) sprowadza wartość do kodu.
 *
 * Odrzucany jest dopiero wpis, którego nie da się rozpoznać — dokładnie ten
 * przypadek, w którym geokoder wstawiał tu „10115 Berlin" (#372).
 */
import { countryOptions } from "@e-logistic/core";
import { useId } from "react";

const OPTIONS = countryOptions();

export function CountryInput({
  value,
  onChange,
  className,
  style,
  placeholder = "DE",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  // `useId`, bo formularz Trip potrafi wyrenderować kilka pól kraju naraz,
  // a dwie listy o tym samym `id` sklejają się w jedną.
  const listId = useId();
  return (
    <>
      <input
        className={className}
        style={style}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="country"
        maxLength={56}
      />
      <datalist id={listId}>
        {OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </datalist>
    </>
  );
}
