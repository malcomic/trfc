export interface AdminUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'member' | 'admin';
    created_at: string;
}
export interface UserListParams {
    search?: string;
    role?: 'member' | 'admin' | '';
}
export declare const getAllUsers: (params?: UserListParams) => Promise<any>;
export declare const createUser: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: "member" | "admin";
}) => Promise<any>;
export declare const updateUser: (userId: string, data: {
    name: string;
    email: string;
    phone: string;
}) => Promise<any>;
export declare const updateUserRole: (userId: string, role: "member" | "admin") => Promise<any>;
export declare const resetUserPassword: (userId: string, password: string) => Promise<any>;
export declare const deleteUser: (userId: string) => Promise<any>;
//# sourceMappingURL=users.d.ts.map