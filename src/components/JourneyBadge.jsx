import React, { useId } from 'react';
import { bnNum } from '../utils/bangla';

/**
 * Study Sentry v2.6 — Bespoke 11-Tier Luxury Obsidian, Burnished Gold & Royal Indigo
 * 3D Heraldic Rank Medallions.
 * Every tier features evolving outer frame geometry + a unique sculpted vector emblem
 * harmonized with Study Sentry's official Obsidian-Gold-Indigo brand identity.
 */
const BADGE_THEMES = {
  1: {
    name: 'Novice',
    frame: 'circle',
    rimLight: '#F6D88B',
    rimMid: '#B98734',
    rimDark: '#5E4012',
    coreTop: '#1E2442',
    coreBot: '#090B16',
    gem: '#FBBF24',
    glow: '#F59E0B',
  },
  2: {
    name: 'Apprentice',
    frame: 'circle-bevel',
    rimLight: '#BAE6FD',
    rimMid: '#38BDF8',
    rimDark: '#0369A1',
    coreTop: '#172542',
    coreBot: '#080D1A',
    gem: '#7DD3FC',
    glow: '#38BDF8',
  },
  3: {
    name: 'Initiate',
    frame: 'hex',
    rimLight: '#FDE68A',
    rimMid: '#D99B26',
    rimDark: '#784B08',
    coreTop: '#232046',
    coreBot: '#0A0B18',
    gem: '#FDE047',
    glow: '#FBBF24',
  },
  4: {
    name: 'Focused',
    frame: 'hex-shield',
    rimLight: '#A5F3FC',
    rimMid: '#22D3EE',
    rimDark: '#0E7490',
    coreTop: '#14293F',
    coreBot: '#070E1A',
    gem: '#67E8F9',
    glow: '#22D3EE',
  },
  5: {
    name: 'Scholar',
    frame: 'octagon',
    rimLight: '#DDD6FE',
    rimMid: '#8B5CF6',
    rimDark: '#4C1D95',
    coreTop: '#251D4A',
    coreBot: '#090818',
    gem: '#C4B5FD',
    glow: '#A78BFA',
  },
  6: {
    name: 'Disciplined',
    frame: 'aegis',
    rimLight: '#FEF08A',
    rimMid: '#EAB308',
    rimDark: '#854D0E',
    coreTop: '#262344',
    coreBot: '#0A0B17',
    gem: '#FACC15',
    glow: '#F59E0B',
  },
  7: {
    name: 'Relentless',
    frame: 'vanguard',
    rimLight: '#FED7AA',
    rimMid: '#FB923C',
    rimDark: '#9A3412',
    coreTop: '#2D1B38',
    coreBot: '#0C0814',
    gem: '#FDBA74',
    glow: '#F97316',
  },
  8: {
    name: 'Vanguard',
    frame: 'winged-oct',
    rimLight: '#E0E7FF',
    rimMid: '#6366F1',
    rimDark: '#312E81',
    coreTop: '#1E2252',
    coreBot: '#080A1C',
    gem: '#A5B4FC',
    glow: '#818CF8',
  },
  9: {
    name: 'Mastermind',
    frame: 'star-seal',
    rimLight: '#F5D0FE',
    rimMid: '#D946EF',
    rimDark: '#701A75',
    coreTop: '#2B1945',
    coreBot: '#0A0716',
    gem: '#F0ABFC',
    glow: '#E879F9',
  },
  10: {
    name: 'Apex',
    frame: 'laurel-crest',
    rimLight: '#CCFBF1',
    rimMid: '#2DD4BF',
    rimDark: '#0F766E',
    coreTop: '#132D3E',
    coreBot: '#060D17',
    gem: '#5EEAD4',
    glow: '#2DD4BF',
  },
  11: {
    name: 'Legend',
    frame: 'imperial-sun',
    rimLight: '#FFF7D6',
    rimMid: '#F59E0B',
    rimDark: '#92400E',
    coreTop: '#2A214A',
    coreBot: '#080714',
    gem: '#FEF08A',
    glow: '#FBBF24',
  },
};

export function badgeTheme(tier) {
  const t = BADGE_THEMES[tier] || BADGE_THEMES[1];
  return { ...t, color: t.gem };
}

function renderOuterFrame(frame, rimGrad, coreGrad, gemColor) {
  switch (frame) {
    case 'circle':
      return (
        <>
          <circle cx="50" cy="46" r="35" fill={rimGrad} />
          <circle cx="50" cy="46" r="30.5" fill={coreGrad} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <circle cx="50" cy="46" r="26.5" fill="none" stroke={gemColor} strokeOpacity="0.32" strokeWidth="1" strokeDasharray="3 3" />
        </>
      );
    case 'circle-bevel':
      return (
        <>
          <circle cx="50" cy="46" r="36" fill={rimGrad} />
          <polygon points="50,7 54,13 46,13" fill={gemColor} />
          <circle cx="50" cy="46" r="30.5" fill={coreGrad} stroke="rgba(255,255,255,0.2)" strokeWidth="1.1" />
          <circle cx="50" cy="46" r="27" fill="none" stroke={gemColor} strokeOpacity="0.4" strokeWidth="1.2" />
        </>
      );
    case 'hex':
      return (
        <>
          <polygon points="50,9 82,27.5 82,64.5 50,83 18,64.5 18,27.5" fill={rimGrad} />
          <polygon points="50,14.5 77,30 77,62 50,77.5 23,62 23,30" fill={coreGrad} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </>
      );
    case 'hex-shield':
      return (
        <>
          <path d="M50 8 L83 22 L79 58 L50 84 L21 58 L17 22 Z" fill={rimGrad} />
          <path d="M50 13.5 L77.5 25.5 L74 55.5 L50 78 L26 55.5 L22.5 25.5 Z" fill={coreGrad} stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
        </>
      );
    case 'octagon':
      return (
        <>
          <polygon points="36,9 64,9 84,29 84,59 64,81 36,81 16,59 16,29" fill={rimGrad} />
          <polygon points="38.5,14 61.5,14 79,31.5 79,56.5 61.5,76 38.5,76 21,56.5 21,31.5" fill={coreGrad} stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
        </>
      );
    case 'aegis':
      return (
        <>
          <path d="M12 32 L22 24 L22 44 L12 38 Z" fill={rimGrad} opacity="0.85" />
          <path d="M88 32 L78 24 L78 44 L88 38 Z" fill={rimGrad} opacity="0.85" />
          <path d="M50 7 L81 20 L78 57 L50 84 L22 57 L19 20 Z" fill={rimGrad} />
          <path d="M50 13 L75.5 23.5 L73 54.5 L50 78 L27 54.5 L24.5 23.5 Z" fill={coreGrad} stroke={gemColor} strokeOpacity="0.45" strokeWidth="1.2" />
        </>
      );
    case 'vanguard':
      return (
        <>
          <path d="M8 28 L22 22 L19 48 L10 42 Z" fill={rimGrad} />
          <path d="M92 28 L78 22 L81 48 L90 42 Z" fill={rimGrad} />
          <polygon points="50,6 83,25 76,65 50,85 24,65 17,25" fill={rimGrad} />
          <polygon points="50,12 77.5,28 71.5,62 50,79 28.5,62 22.5,28" fill={coreGrad} stroke="rgba(255,255,255,0.24)" strokeWidth="1.2" />
        </>
      );
    case 'winged-oct':
      return (
        <>
          <path d="M6 26 L21 23 L18 36 L9 35 Z M9 40 L20 39 L19 50 L12 48 Z" fill={rimGrad} />
          <path d="M94 26 L79 23 L82 36 L91 35 Z M91 40 L80 39 L81 50 L88 48 Z" fill={rimGrad} />
          <polygon points="35,8 65,8 84,27 84,61 65,82 35,82 16,61 16,27" fill={rimGrad} />
          <polygon points="37.5,13.5 62.5,13.5 78.5,29.5 78.5,58.5 62.5,76.5 37.5,76.5 21.5,58.5 21.5,29.5" fill={coreGrad} stroke={gemColor} strokeOpacity="0.5" strokeWidth="1.2" />
        </>
      );
    case 'star-seal':
      return (
        <>
          <polygon
            points="50,4 61,14 77,12 80,28 91,39 83,53 86,69 70,74 61,86 50,79 39,86 30,74 14,69 17,53 9,39 20,28 23,12 39,14"
            fill={rimGrad}
          />
          <circle cx="50" cy="46" r="30.5" fill={coreGrad} stroke={gemColor} strokeOpacity="0.55" strokeWidth="1.4" />
        </>
      );
    case 'laurel-crest':
      return (
        <>
          <path
            d="M16 54 C9 42, 11 26, 22 17 C19 29, 20 42, 25 52 Z M84 54 C91 42, 89 26, 78 17 C81 29, 80 42, 75 52 Z"
            fill={rimGrad}
          />
          <polygon points="50,5 82,23 82,63 50,84 18,63 18,23" fill={rimGrad} />
          <polygon points="50,11 76.5,26 76.5,60 50,78 23.5,60 23.5,26" fill={coreGrad} stroke={gemColor} strokeOpacity="0.55" strokeWidth="1.3" />
        </>
      );
    case 'imperial-sun':
    default:
      return (
        <>
          {/* 12-Point Imperial Sunburst Rays */}
          <polygon
            points="50,2 57,13 69,5 70,18 84,15 79,28 93,31 83,42 94,52 81,58 87,71 73,71 72,84 59,78 50,89 41,78 28,84 27,71 13,71 19,58 6,52 17,42 7,31 21,28 16,15 30,18 31,5 43,13"
            fill={rimGrad}
          />
          <circle cx="50" cy="46" r="31.5" fill={coreGrad} stroke="#FFF7D6" strokeOpacity="0.65" strokeWidth="1.6" />
          <circle cx="50" cy="46" r="27.5" fill="none" stroke="#FBBF24" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 2.5" />
        </>
      );
  }
}

function renderTierEmblem(tier, goldGrad, gemColor) {
  switch (tier) {
    case 1:
      // Polaris 4-Point Guiding Star
      return (
        <g>
          <polygon points="50,23 55.5,40.5 73,46 55.5,51.5 50,69 44.5,51.5 27,46 44.5,40.5" fill={goldGrad} />
          <circle cx="50" cy="46" r="5" fill="#FFFBEB" />
        </g>
      );
    case 2:
      // Illuminated Open Codex + Spark
      return (
        <g>
          <path
            d="M29 36 C37 33, 44 35, 50 40 C56 35, 63 33, 71 36 L71 58 C63 55, 56 57, 50 62 C44 57, 37 55, 29 58 Z"
            fill={goldGrad}
          />
          <line x1="50" y1="39" x2="50" y2="61" stroke="#090D1A" strokeWidth="2.2" />
          <polygon points="50,23 53,29 59,32 53,35 50,41 47,35 41,32 47,29" fill="#E0F2FE" />
        </g>
      );
    case 3:
      // Gilded Fountain Nib + Astral Arc
      return (
        <g>
          <path d="M31 53 A21 21 0 0 1 69 53" fill="none" stroke={gemColor} strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
          <path d="M50 23 L62 47 L55 63 L45 63 L38 47 Z" fill={goldGrad} />
          <line x1="50" y1="25" x2="50" y2="46" stroke="#0A0D1A" strokeWidth="2" />
          <circle cx="50" cy="47" r="3.2" fill="#0A0D1A" />
        </g>
      );
    case 4:
      // Sapphire Chrono-Reticle & Diamond Core
      return (
        <g>
          <circle cx="50" cy="46" r="17" fill="none" stroke={goldGrad} strokeWidth="2.6" />
          <line x1="50" y1="24" x2="50" y2="32" stroke={gemColor} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="50" y1="60" x2="50" y2="68" stroke={gemColor} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="28" y1="46" x2="36" y2="46" stroke={gemColor} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="64" y1="46" x2="72" y2="46" stroke={gemColor} strokeWidth="2.4" strokeLinecap="round" />
          <polygon points="50,36 60,46 50,56 40,46" fill={goldGrad} />
          <circle cx="50" cy="46" r="3.5" fill="#ECFEFF" />
        </g>
      );
    case 5:
      // Faceted Crystalline Wisdom Prism + Twin Laurels
      return (
        <g>
          <polygon points="50,23 65,39 58,63 42,63 35,39" fill={goldGrad} />
          <polygon points="50,23 58,39 50,57 42,39" fill="#F5F3FF" opacity="0.55" />
          <path d="M31 54 Q34 42 40 38" fill="none" stroke={gemColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M69 54 Q66 42 60 38" fill="none" stroke={gemColor} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 6:
      // Sentinel Aegis Inner Shield & Sword Pillar
      return (
        <g>
          <path d="M50 23 L67 31 L63 53 L50 66 L37 53 L33 31 Z" fill="none" stroke={goldGrad} strokeWidth="2.8" />
          <polygon points="50,26 54,34 52,58 50,62 48,58 46,34" fill={goldGrad} />
          <rect x="41" y="37" width="18" height="3.6" rx="1.8" fill="#FEF9C3" />
        </g>
      );
    case 7:
      // Solar Phoenix Rising Flame
      return (
        <g>
          <path
            d="M50 22 C58 32, 67 39, 64 52 C62 61, 55 66, 50 66 C45 66, 38 61, 36 52 C33 39, 42 32, 50 22 Z"
            fill={goldGrad}
          />
          <path
            d="M50 34 C54 40, 58 45, 56 53 C55 58, 52 61, 50 61 C48 61, 45 58, 44 53 C42 45, 46 40, 50 34 Z"
            fill="#FFF7ED"
            opacity="0.88"
          />
        </g>
      );
    case 8:
      // Winged Vanguard Lance & Twin Chevrons
      return (
        <g>
          <path d="M29 44 L44 35 L42 48 L31 53 Z M71 44 L56 35 L58 48 L69 53 Z" fill={gemColor} opacity="0.85" />
          <polygon points="50,21 57,42 53,65 47,65 43,42" fill={goldGrad} />
          <polyline points="40,57 50,49 60,57" fill="none" stroke="#EEF2FF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 9:
      // Sacred Star Polyhedron & Crown Gem
      return (
        <g>
          <polygon points="50,23 67,54 33,54" fill="none" stroke={goldGrad} strokeWidth="2.6" strokeLinejoin="round" />
          <polygon points="50,65 67,34 33,34" fill="none" stroke={gemColor} strokeWidth="2.4" strokeLinejoin="round" />
          <polygon points="50,36 58,44 50,52 42,44" fill={goldGrad} />
          <circle cx="50" cy="44" r="3.4" fill="#FDF4FF" />
        </g>
      );
    case 10:
      // Sovereign Brilliant-Cut Diamond + Rising Crown Rays
      return (
        <g>
          <polygon points="38,33 62,33 70,44 50,66 30,44" fill={goldGrad} />
          <polygon points="43,33 57,33 50,66" fill="#CCFBF1" opacity="0.55" />
          <line x1="30" y1="44" x2="70" y2="44" stroke="#0F172A" strokeOpacity="0.38" strokeWidth="1.5" />
          <polygon points="50,20 53,27 47,27" fill="#99F6E4" />
        </g>
      );
    case 11:
    default:
      // Imperial 5-Spire Sovereign Crown & Radiant Star
      return (
        <g>
          <path
            d="M28 56 L25 35 L38 44 L50 27 L62 44 L75 35 L72 56 Z"
            fill={goldGrad}
            stroke="#FFFBEB"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <rect x="28" y="58" width="44" height="5.5" rx="2.5" fill={goldGrad} />
          <circle cx="50" cy="25" r="3.2" fill="#FFFBEB" />
          <circle cx="25" cy="33.5" r="2.4" fill="#FDE68A" />
          <circle cx="75" cy="33.5" r="2.4" fill="#FDE68A" />
          <circle cx="50" cy="48" r="4" fill="#38BDF8" stroke="#FFFBEB" strokeWidth="1.1" />
        </g>
      );
  }
}

export default function JourneyBadge({ tier = 1, size = 76, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const t = BADGE_THEMES[tier] || BADGE_THEMES[1];
  const rimId = `jbRim_${uid}`;
  const coreId = `jbCore_${uid}`;
  const goldId = `jbGold_${uid}`;
  const sheenId = `jbSheen_${uid}`;

  return (
    <svg
      className={`jp-badge-svg v13-prestige-crest tier-${tier} ${className}`}
      viewBox="0 0 100 112"
      width={size}
      height={Math.round((size * 112) / 100)}
      aria-hidden="true"
      style={{ '--jp-badge-color': t.gem }}
    >
      <defs>
        <linearGradient id={rimId} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0%" stopColor={t.rimLight} />
          <stop offset="48%" stopColor={t.rimMid} />
          <stop offset="100%" stopColor={t.rimDark} />
        </linearGradient>

        <radialGradient id={coreId} cx="0.36" cy="0.24" r="0.85">
          <stop offset="0%" stopColor={t.coreTop} />
          <stop offset="100%" stopColor={t.coreBot} />
        </radialGradient>

        <linearGradient id={goldId} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FFF7D6" />
          <stop offset="45%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        <linearGradient id={sheenId} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.24" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ambient Prestige Back-Halo */}
      <circle cx="50" cy="46" r="41" fill={t.glow} opacity="0.13" />

      {/* Tier-Specific Sculpted Heraldic Medallion Frame */}
      {renderOuterFrame(t.frame, `url(#${rimId})`, `url(#${coreId})`, t.gem)}

      {/* Subtle Glass Specular Top Sheen */}
      <ellipse cx="44" cy="28" rx="18" ry="9" fill={`url(#${sheenId})`} />

      {/* Tier-Specific Bespoke Center Emblem */}
      {renderTierEmblem(tier, `url(#${goldId})`, t.gem)}

      {/* Luxury Beveled Obsidian-Gold Tier Ribbon Plaque */}
      <g>
        <rect
          x="27"
          y="80"
          width="46"
          height="22"
          rx="11"
          fill="#090C18"
          stroke={`url(#${rimId})`}
          strokeWidth="2"
        />
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fontSize="12.5"
          fontWeight="800"
          fill={t.rimLight}
          letterSpacing="0.03em"
        >
          {bnNum(tier)}
        </text>
      </g>
    </svg>
  );
}
