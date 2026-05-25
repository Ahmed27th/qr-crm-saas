const _nf = (decimals = 0) => new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

export function formatPrice(amount: number, decimals = 2): string {
  return `${_nf(decimals).format(amount)} MAD`;
}

export function formatNumber(amount: number, decimals = 0): string {
  return _nf(decimals).format(amount);
}
