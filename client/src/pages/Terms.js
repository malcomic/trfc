import { jsx as _jsx } from "react/jsx-runtime";
import LegalPageLayout from '../components/LegalPageLayout';
import { termsMeta, termsSections } from '../content/termsContent';
export default function Terms() {
    return (_jsx(LegalPageLayout, { meta: termsMeta, sections: termsSections, crossLink: { label: 'Privacy Policy', to: '/privacy' } }));
}
//# sourceMappingURL=Terms.js.map