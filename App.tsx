import React, { useState } from 'react';
import { ShoppingBag, Receipt, PieChart, Key, Menu } from 'lucide-react';
import MenuPlanner from './components/MenuPlanner';
import PriceParser from './components/PriceParser';
import Analytics from './components/Analytics';
import { AppStatus, Meal, ShoppingItem, UserPreferences, ChatMessage, AIPlanResponse } from './types';
import { simulatePriceParsing } from './services/gemini';
import { Chat } from "@google/genai";

const App: React.FC = () => {
  // --- State ---
  const [apiKey, setApiKey] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'menu' | 'prices' | 'analytics'>('menu');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  // -- Persisted Data (Lifted State) --
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<AIPlanResponse | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    familySize: 4,
    budgetWeekly: 10000,
    dietaryRestrictions: "",
    city: "Екатеринбург"
  });

  // --- Actions ---

  const handlePlanUpdate = (newPlan: AIPlanResponse) => {
      setCurrentPlan(newPlan);
      // We only reset the shopping list prices if the ingredients actually changed drastically
      // But to be safe, if we get a new plan, we should invalidate old prices
      if (newPlan.shoppingList.length > 0) {
          // Check if we need to reset prices or just update amounts
          // For simplicity, we keep the parsed prices if the item name matches, 
          // but usually a new plan means new shopping list.
          
          // Generate skeleton for new list
          const skeletonItems: ShoppingItem[] = newPlan.shoppingList.map((item, idx) => ({
             id: idx.toString(),
             name: item.name,
             originalAmount: item.amount,
             prices: [] // Prices cleared, need to re-parse
          }));
          
          setShoppingList(skeletonItems);
          setStatus(AppStatus.IDLE);
      }
  };

  const handleTabChange = (tab: 'menu' | 'prices' | 'analytics') => {
      setActiveTab(tab);
  };

  const handleStartParsing = async () => {
    setStatus(AppStatus.PARSING);
    try {
        const itemNames = shoppingList.map(i => i.name + " " + i.originalAmount);
        
        // This simulates the Playwright process running in the "Backend"
        const pricedItems = await simulatePriceParsing(itemNames, preferences.city);
        
        setShoppingList(pricedItems);
        setStatus(AppStatus.READY);
    } catch (e) {
        console.error(e);
        setStatus(AppStatus.ERROR);
    }
  };

  // --- Render ---

  // API Key Modal (if needed and env not set)
  const showKeyModal = !process.env.API_KEY && !apiKey;
  const hasMeals = currentPlan && currentPlan.meals.length > 0;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans print:bg-white">
      
      {/* Sidebar - Hidden in Print */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-10 hidden md:flex no-print">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-accent" />
            SmartShopper
          </h1>
          <p className="text-xs text-slate-500 mt-1">Yekaterinburg Edition</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => handleTabChange('menu')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'menu' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-slate-800'}`}
          >
            <Menu className="w-5 h-5" />
            <span>Меню-Чат</span>
          </button>

          <button 
             onClick={() => handleTabChange('prices')}
             disabled={!hasMeals}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'prices' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-slate-800'} ${!hasMeals ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Receipt className="w-5 h-5" />
            <span>Цены (Яндекс.Еда)</span>
          </button>

          <button 
             onClick={() => handleTabChange('analytics')}
             disabled={shoppingList.length === 0 || status !== AppStatus.READY}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-slate-800'} ${shoppingList.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <PieChart className="w-5 h-5" />
            <span>Аналитика</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
            <div>Версия 0.9.6 (Persist & Print)</div>
            <div className="mt-1">Статус: {status}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden print:h-auto print:overflow-visible">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 p-4 flex items-center justify-between text-white no-print">
            <span className="font-bold">SmartShopper YEK</span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 print:p-0 print:bg-white">
            
            {activeTab === 'menu' && (
                <div className="h-full max-w-7xl mx-auto menu-container">
                    <MenuPlanner 
                        preferences={preferences}
                        setPreferences={setPreferences}
                        status={status}
                        onPlanUpdated={handlePlanUpdate}
                        // Pass persisted state
                        messages={chatMessages}
                        setMessages={setChatMessages}
                        currentPlan={currentPlan}
                        setCurrentPlan={setCurrentPlan}
                        chatSession={chatSession}
                        setChatSession={setChatSession}
                    />
                </div>
            )}

            {activeTab === 'prices' && (
                <div className="h-full max-w-6xl mx-auto">
                    <PriceParser 
                        status={status} 
                        items={shoppingList} 
                        onStartParsing={handleStartParsing} 
                    />
                </div>
            )}

             {activeTab === 'analytics' && (
                <div className="h-full max-w-4xl mx-auto">
                    <Analytics items={shoppingList} />
                </div>
            )}

        </div>
      </main>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-slate-100 p-3 rounded-full">
                    <Key className="w-6 h-6 text-slate-700" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Требуется Gemini API Key</h2>
                <p className="text-sm text-slate-500">
                    Для работы чата и генерации меню нам нужен доступ к модели Gemini.
                    Ключ сохраняется только в памяти браузера.
                </p>
                <input 
                    type="password" 
                    placeholder="Paste API Key here (starts with AIza...)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-accent font-mono text-sm"
                />
                <button 
                    onClick={() => {
                        if(apiKey.length > 10) {
                            process.env.API_KEY = apiKey; // Hacky inject for demo service
                            setApiKey(apiKey); // trigger re-render
                        }
                    }}
                    className="w-full bg-accent hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Начать работу
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;