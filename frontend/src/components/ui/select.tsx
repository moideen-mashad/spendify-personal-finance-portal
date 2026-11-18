import { forwardRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
  disabled?: boolean;
}
interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  name?: string;
  onBlur?: () => void;
  className?: string;
  id?: string;
}
/** Source-owned select: keyboard navigation, typeahead, focus return and portal positioning come from Radix. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(
    {
      value,
      onValueChange,
      options,
      placeholder = "Select an option",
      label,
      disabled,
      invalid,
      describedBy,
      name,
      onBlur,
      className = "",
      id,
    },
    ref,
  ) {
    return (
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          type="button"
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onBlur={onBlur}
          className={`select-trigger ${className}`}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="select-chevron">
            <ChevronDown size={15} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className="select-content"
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll">
              <ChevronUp size={15} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="select-viewport">
              {options.length ? (
                options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    textValue={option.label}
                    className="select-item"
                  >
                    {option.color && (
                      <span
                        aria-hidden="true"
                        className="select-dot"
                        style={{ background: option.color }}
                      />
                    )}
                    <span className="select-copy">
                      <SelectPrimitive.ItemText>
                        {option.label}
                      </SelectPrimitive.ItemText>
                      {option.description && (
                        <span className="select-description">
                          {option.description}
                        </span>
                      )}
                    </span>
                    <SelectPrimitive.ItemIndicator className="select-check">
                      <Check size={15} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))
              ) : (
                <div className="select-empty">No options available</div>
              )}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="select-scroll">
              <ChevronDown size={15} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);
