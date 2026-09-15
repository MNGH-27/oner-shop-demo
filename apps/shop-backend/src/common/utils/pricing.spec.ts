import { couponDiscount, discountedPrice } from './pricing';

describe('discountedPrice', () => {
  it('rounds the discounted unit price consistently with the storefront', () => {
    expect(discountedPrice(99_999, 15)).toBe(84_999);
  });

  it('keeps the original price when there is no discount', () => {
    expect(discountedPrice(250_000)).toBe(250_000);
  });

  it('clamps invalid percentages to the supported range', () => {
    expect(discountedPrice(250_000, -10)).toBe(250_000);
    expect(discountedPrice(250_000, 120)).toBe(0);
  });
});

describe('couponDiscount', () => {
  it('caps the discount at the coupon maximum', () => {
    expect(couponDiscount(2_000_000, 20, 250_000)).toBe(250_000);
  });

  it('never returns a negative discount', () => {
    expect(couponDiscount(-1, 20, 250_000)).toBe(0);
  });
});
