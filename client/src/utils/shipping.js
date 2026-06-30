export function getShipping(subtotal) {
    return subtotal >= 3000 ? 0 : 250;
}
export function getGrandTotal(subtotal) {
    return subtotal + getShipping(subtotal);
}
//# sourceMappingURL=shipping.js.map