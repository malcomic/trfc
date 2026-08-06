export type StaffRole = 'member' | 'admin' | 'scanner';
export interface AdminUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: StaffRole;
    created_at: string;
}
export interface UserListParams {
    search?: string;
    role?: StaffRole | '';
}
export declare const getAllUsers: (params?: UserListParams) => Promise<any>;
export declare const createUser: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: StaffRole;
}) => Promise<any>;
export declare const updateUser: (userId: string, data: {
    name: string;
    email: string;
    phone: string;
}) => Promise<any>;
export declare const updateUserRole: (userId: string, role: StaffRole) => Promise<any>;
export declare const resetUserPassword: (userId: string, password: string) => Promise<any>;
export declare const deleteUser: (userId: string) => Promise<any>;
//# sourceMappingURL=users.d.ts.map