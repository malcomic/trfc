export declare const getAvailableEquipment: () => Promise<any>;
export declare const createEquipmentHireRequest: (data: {
    equipmentName: string;
    packageType: string;
    hireDate: string;
    returnDate: string;
    phone: string;
}) => Promise<any>;
export declare const getEquipmentHireById: (id: string, phone?: string) => Promise<any>;
export declare const initiateEquipmentPayment: (data: {
    phone: string;
    amount: number;
    equipmentHireId: string;
}) => Promise<import("./payments").PaymentInitiateResponse>;
//# sourceMappingURL=equipment.d.ts.map