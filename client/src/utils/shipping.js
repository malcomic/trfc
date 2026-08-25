export function getShipping(_subtotal) {
    return 0;
}
export function getGrandTotal(subtotal) {
    return subtotal + getShipping(subtotal);
}
//# sourceMappingURL=shipping.js.map