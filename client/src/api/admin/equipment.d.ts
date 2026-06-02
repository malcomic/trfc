export interface AdminEquipmentHire {
    id: string;
    equipment_name: string;
    phone?: string;
    hire_date: string;
    return_date: string;
    total_cost: number;
    payment_status: string;
    status?: string;
    created_at: string;
}
export declare const getEquipmentHireForAdmin: (status?: string) => Promise<AdminEquipmentHire[]>;
//# sourceMappingURL=equipment.d.ts.map