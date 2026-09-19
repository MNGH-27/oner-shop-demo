"use client";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
const STEP = 100_000;
function PriceField({
  name,
  label,
  initial,
  minimum,
  maximum,
}: {
  name: string;
  label: string;
  initial: number;
  minimum: number;
  maximum: number;
}) {
  const [value, setValue] = useState(String(initial));
  const clamp = (next: number) => Math.min(maximum, Math.max(minimum, next));
  const numericValue = Number(value) || 0;
  const normalize = () => setValue(String(clamp(numericValue || minimum)));
  const changeBy = (amount: number) =>
    setValue(String(clamp((numericValue || minimum) + amount)));
  return (
    <label>
      {label}
      <div className="price-stepper">
        <button
          type="button"
          disabled={numericValue <= minimum}
          onClick={() => changeBy(-STEP)}
          aria-label={`${label} کمتر`}
        >
          <Minus size={15} />
        </button>
        <input
          inputMode="numeric"
          type="text"
          pattern="[0-9]*"
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
          onBlur={normalize}
        />
        <button
          type="button"
          disabled={numericValue >= maximum}
          onClick={() => changeBy(STEP)}
          aria-label={`${label} بیشتر`}
        >
          <Plus size={15} />
        </button>
      </div>
      <small>{numericValue.toLocaleString("fa-IR")} تومان</small>
    </label>
  );
}
export function PriceRangeFields({
  minPrice,
  maxPrice,
  rangeMin,
  rangeMax,
}: {
  minPrice?: string;
  maxPrice?: string;
  rangeMin: number;
  rangeMax: number;
}) {
  const minimum = Math.max(0, rangeMin);
  const maximum = Math.max(minimum, rangeMax);
  const initialMinimum = minPrice ? Number(minPrice) : minimum;
  const initialMaximum = maxPrice ? Number(maxPrice) : maximum;
  return (
    <>
      <PriceField
        key={`min-${initialMinimum}-${minimum}-${maximum}`}
        name="minPrice"
        label="حداقل قیمت"
        initial={initialMinimum}
        minimum={minimum}
        maximum={maximum}
      />
      <PriceField
        key={`max-${initialMaximum}-${minimum}-${maximum}`}
        name="maxPrice"
        label="حداکثر قیمت"
        initial={initialMaximum}
        minimum={minimum}
        maximum={maximum}
      />
    </>
  );
}
