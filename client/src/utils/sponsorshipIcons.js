import { Building2, Megaphone, Crown, Handshake, Star, Award, Gem, Trophy, } from 'lucide-react';
export const SPONSORSHIP_ICON_OPTIONS = [
    'Building2',
    'Megaphone',
    'Crown',
    'Handshake',
    'Star',
    'Award',
    'Gem',
    'Trophy',
];
const ICON_MAP = {
    Building2,
    Megaphone,
    Crown,
    Handshake,
    Star,
    Award,
    Gem,
    Trophy,
};
export function getSponsorshipIcon(name) {
    if (name in ICON_MAP) {
        return ICON_MAP[name];
    }
    return Handshake;
}
//# sourceMappingURL=sponsorshipIcons.js.map