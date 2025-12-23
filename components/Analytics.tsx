import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShoppingItem } from '../types';

const Analytics: React.FC<{ items: ShoppingItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400">Нет данных для анализа</div>;
  }

  // Calculate generic buckets
  const data = [
    { name: 'Мясо/Рыба', value: 0 },
    { name: 'Овощи/Фрукты', value: 0 },
    { name: 'Молочка', value: 0 },
    { name: 'Бакалея', value: 0 },
  ];

  items.forEach(item => {
    // Very naive categorization for demo based on string matching
    const n = item.name.toLowerCase();
    const price = item.bestPrice || 0;

    if (n.includes('куриц') || n.includes('мясо') || n.includes('рыба') || n.includes('филе') || n.includes('говяд')) {
        data[0].value += price;
    } else if (n.includes('огур') || n.includes('помид') || n.includes('картоф') || n.includes('фрукт') || n.includes('яблок')) {
        data[1].value += price;
    } else if (n.includes('молок') || n.includes('сыр') || n.includes('творог') || n.includes('кефир')) {
        data[2].value += price;
    } else {
        data[3].value += price;
    }
  });

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#64748b'];

  return (
    <div className="h-full flex flex-col p-6 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Распределение бюджета</h3>
        <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default Analytics;