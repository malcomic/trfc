export declare const getAvailableEquipment: () => Promise<any>;
export declare const createEquipmentHireRequest: (data: {
    equipmentName: string;
    packageType: string;
    hireDate: string;
    returnDate: string;
}) => Promise<any>;
export declare const initiateEquipmentPayment: (data: {
    phone: string;
    amount: number;
    equipmentHireId: string;
}) => Promise<any>;
//# sourceMappingURL=equipment.d.ts.map