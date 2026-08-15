"use client";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
const STEP = 100_000;
function PriceField({ name, label, initial, minimum, maximum }: { name: string; label: string; initial: number; minimum: number; maximum: number }) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const clamp = (next: number) => Math.min(maximum, Math.max(minimum, next));
  return <label>{label}<div className="price-stepper"><button type="button" disabled={value <= minimum} onClick={() => setValue(clamp(value - STEP))} aria-label={`${label} کمتر`}><Minus size={15}/></button><input type="number" name={name} min={minimum} max={maximum} step={STEP} value={value} onChange={(event) => setValue(clamp(Number(event.target.value) || minimum))}/><button type="button" disabled={value >= maximum} onClick={() => setValue(clamp(value + STEP))} aria-label={`${label} بیشتر`}><Plus size={15}/></button></div><small>{value.toLocaleString("fa-IR")} تومان</small></label>
}
export function PriceRangeFields({ minPrice, maxPrice, rangeMin, rangeMax }: { minPrice?: string; maxPrice?: string; rangeMin: number; rangeMax: number }) {
  const minimum = Math.max(0, rangeMin); const maximum = Math.max(minimum, rangeMax);
  return <><PriceField name="minPrice" label="حداقل قیمت" initial={minPrice ? Number(minPrice) : minimum} minimum={minimum} maximum={maximum}/><PriceField name="maxPrice" label="حداکثر قیمت" initial={maxPrice ? Number(maxPrice) : maximum} minimum={minimum} maximum={maximum}/></>;
}
