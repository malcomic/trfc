export declare const registerUser: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
}) => Promise<any>;
export declare const loginUser: (data: {
    email: string;
    password: string;
}) => Promise<any>;
export declare const logoutUser: () => Promise<any>;
export declare const refreshToken: (refreshToken: string) => Promise<any>;
export declare const getUserProfile: () => Promise<any>;
//# sourceMappingURL=auth.d.ts.map