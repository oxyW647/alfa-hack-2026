import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode } from "react";

import { AlertIcon, ChevronDownIcon } from "@/components/icons";
import { groupDigits } from "@/lib/format";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div id={id} className="flex items-center gap-1.5 text-[13px] font-semibold text-red-700">
      <AlertIcon size={14} />
      {message}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  suffix?: string;
  money?: boolean;
  hero?: boolean;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  suffix,
  money = false,
  hero = false,
  ...rest
}: TextFieldProps) {
  const shown = money && value !== "" ? groupDigits(value) : value;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink-600">
        {label}
      </label>
      <div
        className={clsx(
          "input-shell",
          hero ? "h-[84px] rounded-[20px] px-6" : "h-[52px]",
          error && "input-shell-error",
        )}
      >
        <input
          id={id}
          value={shown}
          inputMode={money ? "numeric" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(event) =>
            onChange(money ? event.target.value.replace(/[^\d]/g, "") : event.target.value)
          }
          className={clsx(
            "min-w-0 flex-1 border-0 bg-transparent text-ink-900 outline-none tabular-nums",
            hero ? "text-[40px] font-extrabold tracking-[-0.02em]" : "text-base",
          )}
          {...rest}
        />
        {suffix && (
          <span
            className={clsx(
              "font-semibold text-ink-500",
              hero ? "text-[32px] font-extrabold" : "text-base",
            )}
          >
            {suffix}
          </span>
        )}
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink-600">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            "h-[52px] w-full appearance-none rounded-field border-[1.5px] bg-white pl-4 pr-11 text-base text-ink-900 outline-none focus:border-ink-900 focus:shadow-[0_0_0_4px_rgba(239,49,36,0.16)]",
            error ? "border-red-500" : "border-line",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          size={18}
          className="pointer-events-none absolute right-4 top-[17px] text-ink-600"
        />
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  tone = "light",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  tone?: "light" | "dark";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(
        "flex h-[52px] gap-1 rounded-field p-1",
        tone === "light" ? "bg-mist-100" : "bg-mist-200",
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              "flex-1 rounded-[11px] text-[15px] font-bold",
              active ? "bg-white text-ink-900 shadow-[0_1px_3px_rgba(23,23,26,0.12)]" : "text-ink-600",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="eyebrow mb-3 p-0">{legend}</legend>
      {children}
    </fieldset>
  );
}
