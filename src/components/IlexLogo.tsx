import React from 'react';

export interface IlexLogoProps {
  /**
   * 'gold' / 'dark' / '05': Logo 05 (Dourada) - Para fundos escuros.
   * 'green' / 'light' / '06': Logo 06 (Verde) - Para fundos claros.
   */
  variant?: 'gold' | 'green' | 'dark' | 'light' | '05' | '06';
  size?: number | string;
  className?: string;
  showText?: boolean;
  textSubtitle?: string;
  title?: string;
}

/**
 * Componente oficial de logotipo ILEX:
 * - Fundos escuros (Dark theme): Logo 05 (Dourada) - Pilares em tom Ouro arquitetônico (#A68A56), folha verde e fita dupla dourada.
 * - Fundos claros (Light theme): Logo 06 (Verde) - Pilares em tom Verde Botânico ILEX (#445236), folha verde e fita dupla dourada.
 */
export const IlexLogo: React.FC<IlexLogoProps> = ({
  variant = 'gold',
  size = 36,
  className = '',
  showText = false,
  textSubtitle,
  title = 'ILEX — Representação e Assessoria Comercial',
}) => {
  const isDarkBg = variant === 'gold' || variant === 'dark' || variant === '05';

  const logoSrc = isDarkBg ? '/assets/LOGO-05.svg' : '/assets/LOGO-06.svg';
  const logoAlt = isDarkBg ? 'Logotipo ILEX 05 (Dourada)' : 'Logotipo ILEX 06 (Verde)';

  const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};
  const sizeClass = typeof size === 'string' ? size : '';

  const imgElement = (
    <img
      src={logoSrc}
      alt={logoAlt}
      title={title}
      style={sizeStyle}
      className={`object-contain select-none shrink-0 ${sizeClass}`}
      loading="eager"
    />
  );

  if (!showText) {
    return <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>{imgElement}</div>;
  }

  const textColor = isDarkBg ? '#FFFFFF' : '#1C1A17';
  const subTextColor = isDarkBg ? '#B69A67' : '#384633';

  return (
    <div className={`inline-flex items-center gap-2.5 overflow-hidden shrink-0 ${className}`}>
      {imgElement}
      <div className="overflow-hidden">
        <h1
          className="font-extrabold text-sm tracking-wider uppercase truncate"
          style={{ color: textColor }}
        >
          ILEX CRM
        </h1>
        <p
          className="text-[9px] uppercase tracking-widest font-semibold truncate"
          style={{ color: subTextColor }}
        >
          {textSubtitle || 'Representação & Assessoria'}
        </p>
      </div>
    </div>
  );
};
