export function discountedPrice(price: number, percent = 0): number {
  const normalizedPercent = Math.min(100, Math.max(0, percent));
  return Math.round((price * (100 - normalizedPercent)) / 100);
}

export function couponDiscount(
  amount: number,
  percent: number,
  maximumDiscountAmount: number,
): number {
  const normalizedAmount = Math.max(0, amount);
  const normalizedMaximum = Math.max(0, maximumDiscountAmount);
  const percentageDiscount = Math.round(
    (normalizedAmount * Math.min(100, Math.max(0, percent))) / 100,
  );
  return Math.min(percentageDiscount, normalizedMaximum);
}
