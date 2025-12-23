import React, { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Search, AlertCircle, CheckCircle2, ArrowRight, Store, Truck, XCircle } from 'lucide-react';
import { ShoppingItem, AppStatus } from '../types';

interface PriceParserProps {
  status: AppStatus;
  items: ShoppingItem[];
  onStartParsing: () => void;
}

const PriceParser: React.FC<PriceParserProps> = ({ status, items, onStartParsing }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulate logs when parsing starts
  useEffect(() => {
    if (status === AppStatus.PARSING) {
      setLogs([]);
      const messages = [
        "Initializing Yandex Eats Scraper...",
        "Setting location: Ekaterinburg...",
        "Connecting to Delivery API...",
        "Searching Pyaterochka...",
        "Searching Magnit...",
        "Searching VkusVill...",
        "Searching Perekrestok...",
        "Searching Lenta...",
        "Searching Metro...",
        "Analyzing stock availability...",
        "Calculating best cart combinations...",
      ];
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < messages.length) {
          setLogs(prev => [...prev, messages[i]]);
          i++;
        } else {
          setLogs(prev => [...prev, `Processed item ${Math.floor(Math.random() * items.length + 1)}/${items.length}...`]);
        }
      }, 600);

      return () => clearInterval(interval);
    }
  }, [status, items.length]);

  if (status === AppStatus.READY && items.length > 0) {
    // 1. Identify all unique stores found in the dataset
    const allStoreNames = Array.from(new Set(
        items.flatMap(item => item.prices.map(p => p.storeName))
    )).sort();

    // 2. Calculate totals per store
    const storeTotals = allStoreNames.map(storeName => {
        let totalCost = 0;
        let missingItems = 0;

        items.forEach(item => {
            const priceObj = item.prices.find(p => p.storeName === storeName);
            if (priceObj && priceObj.inStock) {
                totalCost += priceObj.price;
            } else {
                missingItems++;
            }
        });

        return { storeName, totalCost, missingItems };
    });

    // 3. Find the winner
    // Logic: Fewest missing items first, then lowest price.
    const sortedStores = [...storeTotals].sort((a, b) => {
        if (a.missingItems !== b.missingItems) return a.missingItems - b.missingItems;
        return a.totalCost - b.totalCost;
    });

    const winner = sortedStores[0];

    return (
      <div className="flex flex-col h-full space-y-4">
        {/* Winner Banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-xl shadow-md text-white flex-shrink-0">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="w-6 h-6" />
                        Рекомендация: {winner.storeName}
                    </h2>
                    <p className="opacity-90 mt-1">
                        Оптимальный магазин для заказа в Яндекс.Еде.
                        {winner.missingItems > 0 ? ` (Не найдено товаров: ${winner.missingItems})` : ' (Все товары в наличии)'}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-bold">{winner.totalCost.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-xs opacity-75">Общая стоимость корзины</div>
                </div>
            </div>
        </div>

        {/* Horizontal Scrollable Comparison Cards */}
        <div className="flex space-x-4 overflow-x-auto pb-2 flex-shrink-0">
            {sortedStores.map((t, idx) => (
                <div key={idx} className={`min-w-[200px] bg-white p-4 rounded-xl border flex flex-col justify-between ${t.storeName === winner.storeName ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-slate-800 truncate" title={t.storeName}>{t.storeName}</h3>
                            {t.storeName === winner.storeName && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <div className={`text-2xl font-bold ${t.missingItems > 5 ? 'text-slate-400' : 'text-slate-700'}`}>
                            {t.totalCost.toLocaleString()} ₽
                        </div>
                    </div>
                    <div className={`text-xs mt-2 font-medium ${t.missingItems > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {t.missingItems > 0 ? `Нет в наличии: ${t.missingItems}` : 'Полный заказ'}
                    </div>
                </div>
            ))}
        </div>

        {/* Detailed Table (Dynamic Columns) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 text-sm flex justify-between items-center">
             <span>Детализация по товарам</span>
             <span className="text-xs text-slate-400 font-normal">Прокрутите таблицу вправо для просмотра всех магазинов</span>
          </div>
          <div className="overflow-auto flex-1 w-full relative">
            <table className="min-w-full text-left text-sm border-collapse">
              <thead className="bg-white text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 bg-slate-50 sticky left-0 z-20 w-48 border-r border-slate-100">Продукт</th>
                  {allStoreNames.map(store => (
                      <th key={store} className="p-3 text-center min-w-[100px] whitespace-nowrap bg-white">
                          {store}
                      </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  // Calculate min price for this specific row to highlight best deals
                  const prices = item.prices.filter(p => p.inStock).map(p => p.price);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 group">
                      <td className="p-3 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50/50 border-r border-slate-100 z-10">
                          <div className="truncate w-40" title={item.name}>{item.name}</div>
                          <span className="block text-[10px] text-slate-400 font-normal">{item.originalAmount}</span>
                      </td>
                      {allStoreNames.map(store => {
                          const p = item.prices.find(pr => pr.storeName === store);
                          const isBest = p && p.inStock && p.price === minPrice;
                          
                          return (
                            <td key={store} className={`p-3 text-center border-l border-slate-50 ${isBest ? 'bg-green-50/30' : ''}`}>
                                {p?.inStock ? (
                                    <div>
                                        <div className={`font-semibold ${isBest ? 'text-green-700 scale-110 origin-center' : 'text-slate-700'}`}>
                                            {p.price} ₽
                                        </div>
                                        <div className="text-[9px] text-slate-400 truncate w-24 mx-auto opacity-0 group-hover:opacity-100 transition-opacity" title={p.productName}>
                                            {p.productName}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center text-slate-200">
                                        <XCircle className="w-4 h-4" />
                                    </div>
                                )}
                            </td>
                          );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-6">
       {status === AppStatus.PARSING ? (
         <div className="w-full max-w-2xl bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 shadow-2xl h-96 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"/> yandex_eats_scraper.js</span>
                <span className="opacity-50">Status: Running</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                {logs.map((log, i) => (
                    <div key={i} className="flex">
                        <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        <span>{log}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
         </div>
       ) : (
        <div className="text-center space-y-4 max-w-md">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <ShoppingCart className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Сравнение корзин (Все магазины)</h2>
            <p className="text-slate-500">
                Мы соберем вашу продуктовую корзину во всех доступных магазинах (Пятерочка, Магнит, Лента, ВкусВилл, Перекресток и др.), чтобы найти самый выгодный вариант.
            </p>
            <div className="bg-slate-100 border border-slate-200 p-3 rounded text-xs text-slate-600 flex items-start text-left">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                Система эмулирует сборку заказа через API агрегатора для города Екатеринбург.
            </div>
            <button 
                onClick={onStartParsing}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            >
                Найти лучшую цену доставки <ArrowRight className="ml-2 w-4 h-4" />
            </button>
        </div>
       )}
    </div>
  );
};

export default PriceParser;