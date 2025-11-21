import React, { useState } from 'react';

interface LineChartProps {
    data: number[];
    labels: string[];
    title: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, labels, title }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

    if (!data || data.length === 0) {
        return (
             <div className="bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                <div className="flex items-center justify-center h-64 text-gray-400">
                    No hay suficientes datos para mostrar el gráfico.
                </div>
            </div>
        );
    }

    const width = 500;
    const height = 300;
    const padding = 50;
    const yAxisLabelPadding = 10;
    const xAxisLabelPadding = 10;

    const yMax = Math.max(...data) * 1.1 || 100; // Add 10% padding to max value
    const xStep = (width - padding * 2) / (data.length - 1 || 1);
    
    const points = data.map((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (value / yMax) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    const handleMouseOver = (e: React.MouseEvent<SVGRectElement>, index: number) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const value = data[index];
        const label = labels[index];
        setTooltip({
            x: e.clientX - rect.left + 10,
            y: e.clientY - rect.top - 30,
            label,
            value
        });
    };

    const yAxisLabels = () => {
        const ticks = 5;
        const labels = [];
        for (let i = 0; i <= ticks; i++) {
            const value = (yMax / ticks) * i;
            const y = height - padding - (value / yMax) * (height - padding * 2);
            labels.push(
                <g key={i}>
                    <text
                        x={padding - yAxisLabelPadding}
                        y={y}
                        textAnchor="end"
                        alignmentBaseline="middle"
                        className="text-xs fill-current text-gray-400"
                    >
                        {Math.round(value)}€
                    </text>
                    <line
                        x1={padding}
                        y1={y}
                        x2={width - padding}
                        y2={y}
                        className="stroke-current text-gray-700"
                        strokeDasharray="2,2"
                    />
                </g>
            );
        }
        return labels;
    };
    
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 relative">
            <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
            <div className="relative" onMouseLeave={() => setTooltip(null)}>
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    {/* Y-Axis Labels & Grid */}
                    {yAxisLabels()}
                    
                    {/* X-Axis Labels */}
                    {labels.map((label, index) => {
                         const x = padding + index * xStep;
                         return (
                            <text
                                key={index}
                                x={x}
                                y={height - padding + xAxisLabelPadding + 10}
                                textAnchor="middle"
                                className="text-xs fill-current text-gray-400"
                            >
                                {label}
                            </text>
                         )
                    })}
                    
                    {/* Gradient */}
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'rgba(79, 70, 229, 0.5)', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: 'rgba(79, 70, 229, 0)', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>

                    {/* Area under the line */}
                    <polygon
                        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                        fill="url(#lineGradient)"
                    />
                    
                    {/* Line */}
                    <polyline
                        fill="none"
                        stroke="rgb(129, 140, 248)"
                        strokeWidth="2"
                        points={points}
                    />

                    {/* Data Points and Hover Areas */}
                    {data.map((value, index) => {
                        const x = padding + index * xStep;
                        const y = height - padding - (value / yMax) * (height - padding * 2);
                        return (
                            <g key={index}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    className="fill-current text-indigo-400"
                                />
                                <rect
                                    x={x - 10}
                                    y={0}
                                    width="20"
                                    height={height}
                                    fill="transparent"
                                    onMouseOver={(e) => handleMouseOver(e, index)}
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {tooltip && (
                     <div
                        className="absolute bg-gray-900 text-white text-sm rounded-lg py-1 px-3 shadow-lg pointer-events-none transition-opacity duration-200"
                        style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
                    >
                       <div className="font-bold">{tooltip.label}</div>
                       <div>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(tooltip.value)}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LineChart;
