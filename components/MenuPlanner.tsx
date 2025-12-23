import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Calendar, Send, User, Bot, Loader2, X, Clock, Flame, Dumbbell, ShoppingBasket, Coins, Printer, Download } from 'lucide-react';
import { Meal, UserPreferences, AppStatus, ChatMessage, DishDetails, AIPlanResponse } from '../types';
import { createChatSession, getDishDetails } from '../services/gemini';
import { Chat, Part } from "@google/genai";

interface MenuPlannerProps {
  onPlanUpdated: (plan: AIPlanResponse) => void;
  status: AppStatus; 
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
  
  // Lifted Props
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentPlan: AIPlanResponse | null;
  setCurrentPlan: React.Dispatch<React.SetStateAction<AIPlanResponse | null>>;
  chatSession: Chat | null;
  setChatSession: React.Dispatch<React.SetStateAction<Chat | null>>;
}

const MenuPlanner: React.FC<MenuPlannerProps> = ({ 
  onPlanUpdated, 
  preferences, 
  setPreferences,
  messages,
  setMessages,
  currentPlan,
  setCurrentPlan,
  chatSession,
  setChatSession
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat (only if not already existing)
  useEffect(() => {
    if (process.env.API_KEY && !chatSession) {
      try {
        const chat = createChatSession(preferences);
        setChatSession(chat);
        setMessages([{
          id: 'init',
          role: 'model',
          text: `Здравствуйте! Я ваш ИИ-помощник по питанию. Я учитываю сезонность, калорийность и ваш бюджет ${preferences.budgetWeekly}₽ для ${preferences.familySize} человек. Давайте составим меню!`
        }]);
      } catch (e) {
        console.error("Failed to init chat", e);
      }
    }
  }, [preferences, chatSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !chatSession || isLoading) return;

    const userText = input;
    setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);

    try {
      let response = await chatSession.sendMessage({ message: userText });
      
      while (response.functionCalls && response.functionCalls.length > 0) {
        const parts: Part[] = [];
        
        for (const call of response.functionCalls) {
          if (call.name === 'update_meal_plan') {
             const args = call.args as any;
             console.log("Tool args received:", args); 

             const safeMeals = Array.isArray(args.meals) ? args.meals : [];
             const safeShoppingList = Array.isArray(args.shoppingList) ? args.shoppingList : [];
             
             const planData: AIPlanResponse = {
                meals: safeMeals,
                shoppingList: safeShoppingList,
                totalEstimatedCost: typeof args.totalEstimatedCost === 'number' ? args.totalEstimatedCost : 0
             };
             
             setCurrentPlan(planData);
             onPlanUpdated(planData);
             
             parts.push({
               functionResponse: {
                   name: call.name,
                   response: { result: "Plan displayed to user successfully." }
               }
             });
          }
        }

        if (parts.length > 0) {
           response = await chatSession.sendMessage({ message: parts });
        } else {
           break; 
        }
      }

      const modelText = response.text || "Готово! Меню обновлено.";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: modelText }]);

    } catch (error) {
      console.error("Chat Error Detail:", error);
      let errorMessage = "Произошла ошибка при общении с Gemini.";
      if (error instanceof Error) {
          errorMessage += ` (${error.message})`;
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMessage, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] print:h-auto print:block">
      
      {/* LEFT: Chat Interface - Hidden on Print */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] no-print">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <ChefHat className="text-accent w-5 h-5" />
                <h2 className="font-bold text-slate-800">Чат с Планировщиком</h2>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mx-2 
                        ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-white border border-slate-200 text-accent'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                        ${msg.role === 'user' 
                          ? 'bg-accent text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                        } ${msg.isError ? 'bg-red-50 border-red-200 text-red-600' : ''}`}>
                        {msg.text}
                    </div>
                </div>
             </div>
           ))}
           {isLoading && (
             <div className="flex justify-start">
                <div className="flex flex-row items-center ml-12 space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <span className="text-xs text-slate-500">Gemini думает...</span>
                </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Напишите пожелание (например: убери дорогое мясо)..."
                    className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-accent/50 focus:bg-white transition-all outline-none text-slate-700"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2 bg-accent text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* RIGHT: Plan Visualization */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex flex-col print:max-w-none print:w-full">
         {currentPlan ? (
            <MenuDisplay plan={currentPlan} budgetLimit={preferences.budgetWeekly} />
         ) : (
             <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center p-8 text-slate-400 border-dashed border-2 no-print">
                 <Calendar className="w-16 h-16 mb-4 opacity-20" />
                 <h3 className="font-bold text-lg mb-2">Меню еще не готово</h3>
                 <p className="text-sm max-w-xs mx-auto">Начните общение с Gemini, чтобы составить идеальный план на неделю.</p>
             </div>
         )}
      </div>

    </div>
  );
};

export const MenuDisplay: React.FC<{ plan: AIPlanResponse; budgetLimit: number }> = ({ plan, budgetLimit }) => {
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [details, setDetails] = useState<DishDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [view, setView] = useState<'meals' | 'shopping'>('meals');

  const handleDishClick = async (dishName: string) => {
    setSelectedDish(dishName);
    setDetails(null);
    setLoadingDetails(true);
    try {
      const data = await getDishDetails(dishName);
      setDetails(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedDish(null);
    setDetails(null);
  };

  const handlePrint = () => {
      window.print();
  };

  const isOverBudget = plan.totalEstimatedCost > budgetLimit;

  // Safety check for rendering
  const safeMeals = Array.isArray(plan.meals) ? plan.meals : [];
  const safeShoppingList = Array.isArray(plan.shoppingList) ? plan.shoppingList : [];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full max-h-[calc(100vh-140px)] relative print:border-none print:shadow-none print:h-auto print:max-h-none print:overflow-visible">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between print:bg-white print:border-b-2 print:border-black">
           <div className="flex items-center justify-between mb-2 w-full">
                <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-slate-500 print:text-black" />
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 print:text-black">Меню на неделю</h3>
                        <p className="text-xs text-slate-500 print:hidden">Автоматически сгенерировано AI</p>
                    </div>
                </div>
                
                <div className="flex space-x-2 no-print">
                   <button 
                        onClick={handlePrint}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-accent transition-colors"
                        title="Скачать PDF / Печать"
                   >
                        <Printer className="w-5 h-5" />
                   </button>
                   <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
                        <button 
                            onClick={() => setView('meals')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${view === 'meals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Меню
                        </button>
                        <button 
                            onClick={() => setView('shopping')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${view === 'shopping' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Смета
                        </button>
                    </div>
                </div>
           </div>
        </div>

        {/* Budget Indicator - Hidden in Print if nice, or visible for info */}
        <div className={`no-print flex items-center justify-between px-4 py-2 border-b ${isOverBudget ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
             <div className="flex items-center text-sm font-semibold">
                <Coins className="w-4 h-4 mr-2" />
                Итого: {plan.totalEstimatedCost.toLocaleString()} ₽
            </div>
            <div className="text-xs opacity-75">
                Лимит: {budgetLimit.toLocaleString()} ₽
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 print:overflow-visible print:space-y-6">
            {view === 'meals' ? (
                <div className="print:grid print:grid-cols-2 print:gap-4 print:space-y-0">
                {safeMeals.map((meal, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-accent/50 transition-colors group print:border print:border-slate-300 print:shadow-none print:break-inside-avoid">
                    <div className="flex items-center justify-between mb-3">
                        <div className="font-bold text-white bg-slate-800 px-3 py-1 rounded-md text-xs uppercase tracking-wider print:bg-black print:text-white">{meal.day}</div>
                    </div>
                    <div className="space-y-3 text-sm">
                    {/* Main Meals */}
                    <div className="flex items-center group/item cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 print:p-0" onClick={() => handleDishClick(meal.breakfast)}>
                        <span className="w-20 font-semibold text-slate-500 text-xs uppercase print:text-black">Завтрак</span>
                        <span className="text-slate-800 font-medium group-hover/item:text-accent transition-colors print:text-black">{meal.breakfast}</span>
                    </div>
                    <div className="flex items-center group/item cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 print:p-0" onClick={() => handleDishClick(meal.lunch)}>
                        <span className="w-20 font-semibold text-slate-500 text-xs uppercase print:text-black">Обед</span>
                        <span className="text-slate-800 font-medium group-hover/item:text-accent transition-colors print:text-black">{meal.lunch}</span>
                    </div>
                     <div className="flex items-center group/item cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 print:p-0" onClick={() => handleDishClick(meal.snackAfternoon)}>
                        <span className="w-20 font-semibold text-slate-400 text-xs uppercase print:text-black">Полдник</span>
                        <span className="text-slate-600 font-medium group-hover/item:text-accent transition-colors print:text-black">{meal.snackAfternoon}</span>
                    </div>
                    <div className="flex items-center group/item cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 print:p-0" onClick={() => handleDishClick(meal.dinner)}>
                        <span className="w-20 font-semibold text-slate-500 text-xs uppercase print:text-black">Ужин</span>
                        <span className="text-slate-800 font-medium group-hover/item:text-accent transition-colors print:text-black">{meal.dinner}</span>
                    </div>
                     <div className="flex items-center group/item cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 print:p-0" onClick={() => handleDishClick(meal.snackEvening)}>
                        <span className="w-20 font-semibold text-slate-400 text-xs uppercase print:text-black">Вечер</span>
                        <span className="text-slate-600 font-medium group-hover/item:text-accent transition-colors print:text-black">{meal.snackEvening}</span>
                    </div>
                    </div>
                </div>
                ))}
                </div>
            ) : (
                <div className="space-y-2 print:columns-2 print:gap-4">
                    {safeShoppingList.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm print:bg-white print:border-b print:border-slate-200 print:rounded-none">
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-800">{item.name}</span>
                                <span className="text-xs text-slate-500">{item.amount}</span>
                            </div>
                            <span className="font-bold text-slate-700 whitespace-nowrap">~{item.estimatedPrice} ₽</span>
                        </div>
                    ))}
                    <div className="pt-4 text-center text-xs text-slate-400 no-print">
                        * Цены приблизительные. Точный расчет во вкладке "Цены".
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Dish Details Modal */}
      {selectedDish && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
               <div>
                 <h3 className="font-bold text-lg text-slate-800 pr-8">{selectedDish}</h3>
                 <p className="text-xs text-slate-500">Информация о блюде</p>
               </div>
               <button onClick={closeDetails} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <X className="w-6 h-6" />
               </button>
             </div>

             <div className="p-6 overflow-y-auto">
               {loadingDetails ? (
                 <div className="flex flex-col items-center justify-center py-10 space-y-4">
                   <Loader2 className="w-10 h-10 text-accent animate-spin" />
                   <p className="text-sm text-slate-500">Шеф-повар пишет рецепт...</p>
                 </div>
               ) : details ? (
                 <div className="space-y-6">
                   {/* Badges */}
                   <div className="flex flex-wrap gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1
                        ${details.difficulty === 'Легко' ? 'bg-green-100 text-green-700' : 
                          details.difficulty === 'Средне' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'}`}>
                        <Dumbbell className="w-3 h-3" />
                        {details.difficulty}
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {details.time}
                      </div>
                   </div>

                   {/* Macros */}
                   <div className="grid grid-cols-4 gap-2 text-center">
                     <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="text-xs text-slate-400 mb-1">Ккал</div>
                       <div className="font-bold text-slate-800 flex items-center justify-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {details.calories}
                       </div>
                     </div>
                     <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="text-xs text-slate-400 mb-1">Белки</div>
                       <div className="font-bold text-slate-800">{details.protein}г</div>
                     </div>
                     <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="text-xs text-slate-400 mb-1">Жиры</div>
                       <div className="font-bold text-slate-800">{details.fats}г</div>
                     </div>
                     <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="text-xs text-slate-400 mb-1">Угл.</div>
                       <div className="font-bold text-slate-800">{details.carbs}г</div>
                     </div>
                   </div>

                   {/* Recipe */}
                   <div>
                     <h4 className="font-bold text-sm text-slate-800 mb-2 uppercase tracking-wide">Как готовить</h4>
                     <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                       {details.recipeShort}
                     </p>
                   </div>
                 </div>
               ) : (
                 <div className="text-center text-red-500 py-10">Не удалось загрузить данные</div>
               )}
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuPlanner;