import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';

export default function StockChart({ data }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background:  { type: ColorType.Solid, color: 'transparent' },
        textColor:   '#94a3b8',
      },
      grid: {
        vertLines:   { color: '#1e293b', style: LineStyle.Dotted },
        horzLines:   { color: '#1e293b', style: LineStyle.Dotted },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#334155' },
      timeScale:        { borderColor: '#334155', timeVisible: true },
      width:  containerRef.current.clientWidth,
      height: 320,
    });

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const candleSeries = chart.addCandlestickSeries({
      upColor:   '#10b981',
      downColor: '#ef4444',
      borderUpColor:   '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor:   '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(
      sorted.map(d => ({
        time:  d.date.slice(0, 10),
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      }))
    );

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      chart.remove();
      ro.disconnect();
    };
  }, [data]);

  if (!data.length) {
    return <div className="h-80 flex items-center justify-center text-slate-500">No chart data</div>;
  }

  return <div ref={containerRef} className="w-full" />;
}
