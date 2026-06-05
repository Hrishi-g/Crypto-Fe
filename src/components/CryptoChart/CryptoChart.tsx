import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, AreaSeries } from 'lightweight-charts';

interface ChartDataPoint {
  time: number;
  value: number;
}

interface CryptoChartProps {
  data: ChartDataPoint[];
  isPositive?: boolean;
}

const CryptoChart: React.FC<CryptoChartProps> = ({ data, isPositive = true }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#848e9c',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          style: 1,
          labelBackgroundColor: '#121212',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          style: 1,
          labelBackgroundColor: '#121212',
        },
      },
    });

    chartRef.current = chart;

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: isPositive ? '#00ff88' : '#ff4d4d',
      topColor: isPositive ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 77, 77, 0.4)',
      bottomColor: isPositive ? 'rgba(0, 255, 136, 0.0)' : 'rgba(255, 77, 77, 0.0)',
      lineWidth: 2,
    });
    seriesRef.current = newSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isPositive]);

  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      // lightweight-charts expects time in seconds for Unix Timestamps
      const formattedData = data.map(d => ({
        time: (Math.floor(d.time / 1000)) as any,
        value: d.value
      })).sort((a, b) => a.time - b.time);
      
      // Eliminate exact duplicates if any
      const uniqueData = formattedData.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
      seriesRef.current.setData(uniqueData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default CryptoChart;
