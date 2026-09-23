import React, { useState, useId } from 'react';
import { TrophyIcon } from './icons.js';

export interface ChartDataPoint {
  readonly label: string;
  readonly value: number;
  readonly date?: string;
  readonly isPR?: boolean;
  readonly subtitle?: string;
}

export interface SimpleLineChartProps {
  readonly data: readonly ChartDataPoint[];
  readonly unit?: string;
  readonly height?: number;
  readonly ariaLabel?: string;
  readonly color?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  unit = 'kg',
  height = 200,
  ariaLabel = 'Gráfico de evolução',
  color = 'var(--tita-primary, #6366f1)',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradientId = `chart-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--tita-text-muted)',
          fontSize: 'var(--tita-text-sm)',
          border: '1px dashed var(--tita-border)',
          borderRadius: 'var(--tita-radius-md)',
        }}
      >
        Dados insuficientes para gerar o gráfico
      </div>
    );
  }

  // Padding inside viewBox
  const paddingX = 40;
  const paddingY = 30;
  const svgWidth = 500;
  const svgHeight = height;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  // Dynamic integer-friendly auto-zoom domain (no deceptive smoothing, honest data domain)
  const span = rawMax - rawMin;
  const padding = span > 0 ? span * 0.15 : rawMin > 0 ? rawMin * 0.15 : 5;
  const step = span > 50 ? 10 : span > 20 ? 5 : 2.5;
  const minVal = Math.max(0, Math.floor((rawMin - padding) / step) * step);
  const maxVal = Math.max(minVal + step, Math.ceil((rawMax + padding) / step) * step);
  const valRange = maxVal - minVal || 1;

  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  // Coordinate mapping
  const points = data.map((d, idx) => {
    const x = data.length === 1 ? svgWidth / 2 : paddingX + (idx / (data.length - 1)) * plotWidth;
    const y = svgHeight - paddingY - ((d.value - minVal) / valRange) * plotHeight;
    return { x, y, data: d, idx };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Fill area under the curve
  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x},${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`
      : '';

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      {/* Active Point Info Banner */}
      {activePoint && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--tita-space-2)',
            padding: 'var(--tita-space-2) var(--tita-space-3)',
            backgroundColor: 'var(--tita-surface-raised, rgba(255,255,255,0.05))',
            borderRadius: 'var(--tita-radius-sm)',
            border: '1px solid var(--tita-border)',
            fontSize: 'var(--tita-text-xs)',
          }}
        >
          <div>
            <span style={{ color: 'var(--tita-text-muted)' }}>{activePoint.data.label}: </span>
            <strong style={{ color: 'var(--tita-text)', fontSize: 'var(--tita-text-sm)' }}>
              {activePoint.data.value} {unit}
            </strong>
            {activePoint.data.subtitle && (
              <span style={{ color: 'var(--tita-text-muted)', marginLeft: 'var(--tita-space-2)' }}>
                ({activePoint.data.subtitle})
              </span>
            )}
          </div>
          {activePoint.data.isPR && (
            <span
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                color: 'var(--tita-warning)',
                padding: '2px 8px',
                borderRadius: 'var(--tita-radius-full)',
                fontWeight: 'bold',
                fontSize: 'var(--tita-text-xs)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <TrophyIcon aria-hidden="true" /> Recorde Pessoal
            </span>
          )}
        </div>
      )}

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height, overflow: 'visible' }}
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = svgHeight - paddingY - ratio * plotHeight;
          const val = Math.round(minVal + ratio * valRange);
          return (
            <g key={i}>
              <line
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="var(--tita-border, rgba(255,255,255,0.1))"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--tita-text-muted, #888)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Gradient fill */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

        {/* Main Line */}
        {points.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((pt) => {
          const isHovered = hoveredIdx === pt.idx;
          const isPR = pt.data.isPR;

          return (
            <g
              key={pt.idx}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(pt.idx)}
              onClick={() => setHoveredIdx(pt.idx)}
            >
              {/* Outer PR halo */}
              {isPR && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 12 : 9}
                  fill="none"
                  stroke="var(--tita-warning)"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  opacity="0.9"
                />
              )}

              {/* Point circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 7 : isPR ? 5 : 4}
                fill={isPR ? 'var(--tita-warning)' : isHovered ? '#ffffff' : color}
                stroke={isHovered ? color : 'var(--tita-surface, #1e293b)'}
                strokeWidth="2"
                style={{ transition: 'all 0.15s ease' }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
