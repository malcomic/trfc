import { jsx as _jsx } from "react/jsx-runtime";
import LegalPageLayout from '../components/LegalPageLayout';
import { privacyMeta, privacySections } from '../content/privacyContent';
export default function Privacy() {
    return (_jsx(LegalPageLayout, { meta: privacyMeta, sections: privacySections, crossLink: { label: 'Terms of Service', to: '/terms' } }));
}
//# sourceMappingURL=Privacy.js.map