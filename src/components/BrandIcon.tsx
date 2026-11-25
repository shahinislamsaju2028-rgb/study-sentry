import React from 'react';

import markTransparent01 from '../assets/brand-icons/01_mark_transparent.svg';
import appIconObsidian02 from '../assets/brand-icons/02_app_icon_obsidian.svg';
import markOnWhite03 from '../assets/brand-icons/03_mark_on_white.svg';
import lineMonochrome04 from '../assets/brand-icons/04_line_monochrome.svg';
import lineOnObsidian05 from '../assets/brand-icons/05_line_on_obsidian_icon.svg';
import smallClockOnly07 from '../assets/brand-icons/07_small_clock_only.svg';
import smallClockOnlyTrans07 from '../assets/brand-icons/07_small_clock_only_transparent.svg';
import smallClockBook08 from '../assets/brand-icons/08_small_clock_book.svg';
import smallClockBookTrans08 from '../assets/brand-icons/08_small_clock_book_transparent.svg';
import logoFull from '../assets/brand-icons/logo.svg';
import logoMarkTrans from '../assets/brand-icons/logo-mark-transparent.svg';
import logoSmall16_24 from '../assets/brand-icons/logo-small-16-24px.svg';
import logoSmall16_24Trans from '../assets/brand-icons/logo-small-16-24px-transparent.svg';
import logoSmall32_40 from '../assets/brand-icons/logo-small-32-40px.svg';
import logoSmall32_40Trans from '../assets/brand-icons/logo-small-32-40px-transparent.svg';

export const BRAND_ICON_PACK = {
  markTransparent01,
  appIconObsidian02,
  markOnWhite03,
  lineMonochrome04,
  lineOnObsidian05,
  smallClockOnly07,
  smallClockOnlyTrans07,
  smallClockBook08,
  smallClockBookTrans08,
  logoFull,
  logoMarkTrans,
  logoSmall16_24,
  logoSmall16_24Trans,
  logoSmall32_40,
  logoSmall32_40Trans,
} as const;

export type BrandIconVariant =
  | 'auto-obsidian'
  | 'auto-transparent'
  | 'obsidian'
  | 'transparent'
  | 'white'
  | 'line'
  | 'line-obsidian'
  | 'small-16'
  | 'small-16-transparent'
  | 'small-32'
  | 'small-32-transparent'
  | 'clock-only'
  | 'clock-only-transparent'
  | 'clock-book'
  | 'clock-book-transparent';

export interface BrandIconProps {
  size?: number;
  variant?: BrandIconVariant;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function resolveBrandIconUrl(
  size = 32,
  variant: BrandIconVariant = 'auto-obsidian'
): string {
  switch (variant) {
    case 'obsidian':
      return appIconObsidian02 || logoFull;
    case 'transparent':
      return markTransparent01 || logoMarkTrans;
    case 'white':
      return markOnWhite03;
    case 'line':
      return lineMonochrome04;
    case 'line-obsidian':
      return lineOnObsidian05;
    case 'small-16':
      return logoSmall16_24;
    case 'small-16-transparent':
      return logoSmall16_24Trans;
    case 'small-32':
      return logoSmall32_40;
    case 'small-32-transparent':
      return logoSmall32_40Trans;
    case 'clock-only':
      return smallClockOnly07;
    case 'clock-only-transparent':
      return smallClockOnlyTrans07;
    case 'clock-book':
      return smallClockBook08;
    case 'clock-book-transparent':
      return smallClockBookTrans08;
    case 'auto-transparent':
      if (size <= 24) return logoSmall16_24Trans;
      if (size <= 44) return logoSmall32_40Trans;
      return logoMarkTrans;
    case 'auto-obsidian':
    default:
      if (size <= 24) return logoSmall16_24;
      if (size <= 44) return logoSmall32_40;
      return logoFull;
  }
}

export const BrandIcon: React.FC<BrandIconProps> = ({
  size = 32,
  variant = 'auto-obsidian',
  className = '',
  alt = 'Study Sentry',
  style,
}) => {
  const src = resolveBrandIconUrl(size, variant);
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    />
  );
};

export default BrandIcon;
