import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function AdminResponsiveData({ desktop, mobile, empty, isEmpty, }) {
    if (isEmpty && empty) {
        return _jsx(_Fragment, { children: empty });
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-x-auto", children: desktop }), _jsx("div", { className: "lg:hidden space-y-3", children: mobile })] }));
}
//# sourceMappingURL=AdminResponsiveData.js.map