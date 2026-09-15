import { TransformFnParams } from 'class-transformer';

export function parseBooleanQuery({ value }: TransformFnParams): unknown {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}
