export const formatPrice = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
export const discountedPrice = (price: number, percent = 0) => Math.round(price * (100 - percent) / 100);
