"use client";

import React, { forwardRef, useRef, useImperativeHandle } from "react";

export interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  containerClassName?: string;
  clearButtonClassName?: string;
}

export const ClearableInput = forwardRef<HTMLInputElement, ClearableInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      className = "",
      containerClassName = "",
      clearButtonClassName = "",
      type = "text",
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const hasValue = value !== undefined && value !== null && String(value).length > 0;
    const canClear = hasValue && !disabled && !readOnly;

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: "", name: props.name || "" },
          currentTarget: { value: "", name: props.name || "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      inputRef.current?.focus();
    };

    return (
      <div className={`relative flex items-center ${containerClassName}`}>
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          className={`${className} ${canClear ? "pr-8" : ""}`}
          {...props}
        />
        {canClear && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            title="Clear"
            aria-label="Clear"
            className={`search-clear-btn absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer shrink-0 ${clearButtonClassName}`}
          >
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ClearableInput.displayName = "ClearableInput";
export default ClearableInput;
