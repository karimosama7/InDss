
import React, { useState, useMemo } from 'react';
import { PRODUCTION_DATA, PACKAGING_DATA, getPackageWeight, MATERIAL_WEIGHTS_DB } from './data';
import { AppTab, SelectedProduct, CalculationResult } from './types';

const App: React.FC = () => {
    const [systemMode, setSystemMode] = useState<'production' | 'packaging'>('production');
    const [activeTab, setActiveTab] = useState<AppTab>(AppTab.PRODUCTION);
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [currentCode, setCurrentCode] = useState('');
    const [quantity, setQuantity] = useState(1000);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayMode, setDisplayMode] = useState<'packages' | 'kg'>('kg');

    const sourceData = systemMode === 'production' ? PRODUCTION_DATA : PACKAGING_DATA;

    const handleAdd = (code?: string, type?: 'production' | 'packaging', qty?: number) => {
        const targetCode = code || currentCode;
        const targetType = type || systemMode;
        const targetQty = qty || quantity;

        if (!targetCode || targetQty <= 0) return;
        
        const dataSet = targetType === 'production' ? PRODUCTION_DATA : PACKAGING_DATA;
        const prod = dataSet[targetCode];
        
        if (!prod) return;

        setSelectedProducts(prev => [...prev, {
            code: targetCode,
            name: prod.name,
            quantity: targetQty,
            unit: prod.unit,
            type: targetType
        }]);
        if (!code) setCurrentCode('');
    };

    const handleRemoveIndividual = (index: number) => {
        setSelectedProducts(prev => prev.filter((_, i) => i !== index));
    };

    const results = useMemo(() => {
        const map: Record<string, CalculationResult> = {};
        selectedProducts.forEach(p => {
            const data = p.type === 'production' ? PRODUCTION_DATA[p.code] : PACKAGING_DATA[p.code];
            if (!data) return;

            data.components.forEach(comp => {
                const key = comp.code;
                const amount = p.type === 'production' ? comp.ratio * (p.quantity / 1000) : comp.ratio * p.quantity;

                if (!map[key]) {
                    const weight = getPackageWeight(comp.code, comp.name, comp.unit);
                    map[key] = {
                        code: comp.code,
                        name: comp.name,
                        unit: comp.unit,
                        totalQuantity: 0,
                        packageWeight: weight,
                        totalKg: 0,
                        usedIn: []
                    };
                }

                map[key].totalQuantity += amount;
                map[key].totalKg! += amount * (map[key].packageWeight || 1);
                map[key].usedIn.push({ productName: p.name, quantity: p.quantity, amount, unit: comp.unit });
            });
        });
        return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity);
    }, [selectedProducts]);

    const totals = useMemo(() => {
        return {
            totalWeightKg: results.reduce((acc, curr) => acc + (curr.totalKg || 0), 0),
            totalItems: results.reduce((acc, curr) => acc + curr.totalQuantity, 0)
        };
    }, [results]);

    const exportReport = () => {
        if (selectedProducts.length === 0) return;
        let txt = `\ufeff🏭 تقرير شركة الساقية للصناعات\n📅 التاريخ: ${new Date().toLocaleString('ar-EG')}\n`;
        txt += `==========================================\n`;
        txt += `📦 الأصناف المطلوبة:\n`;
        selectedProducts.forEach(p => txt += `  • ${p.name} [${p.code}]: ${p.quantity} ${p.unit}\n`);
        txt += `\n📊 ملخص الإجماليات:\n`;
        txt += `  - الوزن الإجمالي: ${totals.totalWeightKg.toFixed(2)} كجم\n`;
        txt += `  - إجمالي الوحدات: ${totals.totalItems.toFixed(2)}\n`;
        txt += `\n⚖️ قائمة احتياجات الخامات:\n`;
        txt += `------------------------------------------\n`;
        results.forEach((r, i) => {
            txt += `${i + 1}. ${r.name}\n`;
            txt += `   الكمية: ${r.totalQuantity.toFixed(3)} ${r.unit}`;
            if (r.totalKg! > 0) txt += ` (${r.totalKg!.toFixed(2)} كجم)`;
            txt += `\n`;
        });
        
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `تقرير_الساقية_${Date.now()}.txt`;
        link.click();
    };

    const filteredSearch = useMemo(() => {
        if (!searchTerm) return [];
        const resultsArray: Array<any> = [];
        Object.values(PRODUCTION_DATA).forEach(p => {
            if (p.name.includes(searchTerm) || p.code.includes(searchTerm)) {
                resultsArray.push({ ...p, source: 'production' });
            }
        });
        Object.values(PACKAGING_DATA).forEach(p => {
            if (p.name.includes(searchTerm) || p.code.includes(searchTerm)) {
                resultsArray.push({ ...p, source: 'packaging' });
            }
        });
        return resultsArray;
    }, [searchTerm]);

    return (
        <div className="min-h-screen bg-[#f0f2f5] text-right pb-40" dir="rtl">
            {/* Desktop Header */}
            <header className="bg-black text-white border-b-4 border-green-500 shadow-xl hidden md:block">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-500 p-2 rounded-lg">
                            <span className="text-3xl text-black">🏭</span>
                        </div>
                        <h1 className="text-2xl font-black">الساقية للصناعات</h1>
                    </div>
                    <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800">
                        <button 
                            onClick={() => {setSystemMode('production'); setSelectedProducts([]);}}
                            className={`px-8 py-2 text-sm font-black rounded-lg transition-all ${systemMode === 'production' ? 'bg-green-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            🏗️ الإنتاج
                        </button>
                        <button 
                            onClick={() => {setSystemMode('packaging'); setSelectedProducts([]);}}
                            className={`px-8 py-2 text-sm font-black rounded-lg transition-all ${systemMode === 'packaging' ? 'bg-green-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            📦 التعبئة
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Title Bar */}
            <div className="md:hidden bg-black text-white p-4 border-b-4 border-green-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl ml-2">🏭</span>
                <h1 className="text-xl font-black tracking-tighter">الساقية للصناعات</h1>
            </div>

            <main className="container mx-auto px-4 mt-6 max-w-7xl">
                {/* Desktop Tabs */}
                <div className="hidden md:flex flex-wrap gap-2 mb-8">
                    {[
                        { id: AppTab.PRODUCTION, label: 'الحاسبة', icon: '🧮' },
                        { id: AppTab.PRODUCTS, label: 'الأصناف', icon: '📋' },
                        { id: AppTab.WEIGHTS, label: 'الأوزان', icon: '⚖️' },
                        { id: AppTab.SEARCH, label: 'بحث', icon: '🔍' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black transition-all shadow ${activeTab === tab.id ? 'bg-black text-green-400 border-2 border-green-500' : 'bg-white text-neutral-600 border border-neutral-200'}`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === AppTab.PRODUCTION && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Control Section */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-[25px] border-2 border-black shadow-lg">
                                <h3 className="text-lg font-black text-black mb-6 border-r-4 border-green-600 pr-3 leading-none">إضافة طلبية</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-black text-neutral-500 block mb-2">اسم المنتج (واضح وظاهر):</label>
                                        <select 
                                            className="w-full p-4 bg-white border-2 border-black rounded-xl font-black text-xl text-black outline-none focus:ring-4 focus:ring-green-100 appearance-none shadow-sm"
                                            value={currentCode}
                                            onChange={(e) => setCurrentCode(e.target.value)}
                                        >
                                            <option value="" className="text-neutral-400">--- اختر المنتج الآن ---</option>
                                            {Object.values(sourceData).map(p => (
                                                <option key={p.code} value={p.code} className="font-bold py-2">
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-neutral-500 block mb-2">الكمية المطلوب إنتاجها ({sourceData[currentCode]?.unit || '--'}):</label>
                                        <div className="flex flex-col gap-3">
                                            <input 
                                                type="number"
                                                className="w-full p-4 bg-neutral-100 text-black border-2 border-black rounded-xl text-center font-black text-4xl focus:bg-white focus:outline-none transition-colors"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Number(e.target.value))}
                                            />
                                            <button 
                                                onClick={() => handleAdd()}
                                                className="w-full bg-green-600 text-black py-4 rounded-xl font-black text-xl hover:bg-green-500 transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1 shadow-md"
                                            >
                                                إضافة لبيان العمل
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedProducts.length > 0 && (
                                <div className="bg-black p-5 rounded-[25px] text-white shadow-xl border-t-4 border-green-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black text-green-400">الطلبات الحالية ({selectedProducts.length})</h3>
                                        <button onClick={() => setSelectedProducts([])} className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase">حذف الكل</button>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedProducts.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-white/10 rounded-xl border border-white/5 hover:bg-white/20 transition-all">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs">{p.name}</span>
                                                    <span className="text-[10px] text-green-400">{p.quantity} {p.unit}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveIndividual(i)}
                                                    className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-colors border border-red-500/30"
                                                    title="حذف هذا الصنف"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results Section */}
                        <div className="lg:col-span-8 space-y-6">
                            {results.length > 0 ? (
                                <>
                                    {/* Big Bold Totals */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black p-6 rounded-3xl shadow-xl border-l-[8px] border-green-500">
                                            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">الوزن الإجمالي</p>
                                            <div className="flex items-baseline gap-2 text-white">
                                                <span className="text-6xl font-black tracking-tighter">{totals.totalWeightKg.toLocaleString(undefined, {minimumFractionDigits: 1})}</span>
                                                <span className="text-lg font-black text-green-500">كجم</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-black">
                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">إجمالي الوحدات</p>
                                            <div className="flex items-baseline gap-2 text-black">
                                                <span className="text-6xl font-black tracking-tighter">{totals.totalItems.toLocaleString(undefined, {minimumFractionDigits: 1})}</span>
                                                <span className="text-lg font-black text-neutral-400">وحدة</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Results Card */}
                                    <div className="bg-white rounded-3xl shadow-xl border-2 border-black overflow-hidden">
                                        <div className="bg-black text-white p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <h2 className="text-lg font-black">📋 بيان الخامات المطلوبة</h2>
                                            <div className="flex bg-[#222] p-1 rounded-lg border border-neutral-700">
                                                <button 
                                                    onClick={() => setDisplayMode('kg')} 
                                                    className={`px-6 py-2 rounded-md text-[10px] font-black transition-all ${displayMode === 'kg' ? 'bg-green-600 text-black' : 'text-neutral-500'}`}
                                                >
                                                    بالكيلو
                                                </button>
                                                <button 
                                                    onClick={() => setDisplayMode('packages')} 
                                                    className={`px-6 py-2 rounded-md text-[10px] font-black transition-all ${displayMode === 'packages' ? 'bg-green-600 text-black' : 'text-neutral-500'}`}
                                                >
                                                    بالعدد
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f8f9fa]">
                                            {results.map((res, idx) => (
                                                <div key={idx} className="p-5 border-2 border-neutral-200 bg-white rounded-2xl hover:border-green-600 transition-all">
                                                    <div className="flex justify-between items-start mb-3 border-b border-neutral-100 pb-2">
                                                        <h4 className="font-black text-black text-sm leading-tight flex-1">{res.name}</h4>
                                                        <span className="text-[9px] bg-black text-green-500 px-2 py-0.5 rounded font-mono">#{res.code}</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-5xl font-black text-black tracking-tighter">
                                                            {displayMode === 'kg' ? res.totalKg?.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2}) : res.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 3})}
                                                        </span>
                                                        <span className="text-[10px] font-black text-neutral-400 uppercase">
                                                            {displayMode === 'kg' ? 'كجم' : res.unit}
                                                        </span>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center text-[10px] font-black text-neutral-500">
                                                        <span>الوزن المرجعي: <b className="text-black">{res.packageWeight} كجم</b></span>
                                                        <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded">لـ {res.usedIn.length} أصناف</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-[40px] border-4 border-dashed border-neutral-200 text-neutral-300">
                                    <span className="text-8xl mb-6 opacity-20">🧮</span>
                                    <p className="font-black text-xl">أضف منتجات للتحليل</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === AppTab.PRODUCTS && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.values(sourceData).map(p => (
                            <div key={p.code} className="bg-white border-2 border-black rounded-3xl shadow-lg flex flex-col overflow-hidden group hover:border-green-600 transition-all">
                                <div className="bg-black text-white p-4 flex justify-between items-center border-b-2 border-green-500">
                                    <h3 className="font-black text-lg">{p.name}</h3>
                                    <span className="text-[10px] font-mono text-green-500">#{p.code}</span>
                                </div>
                                <div className="p-4 space-y-2 bg-[#fdfdfd]">
                                    {p.components.map((c, i) => (
                                        <div key={i} className="flex justify-between items-center text-[11px] p-3 bg-white border border-neutral-100 rounded-xl">
                                            <span className="text-neutral-700 font-bold">{c.name}</span>
                                            <span className="font-black text-black bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">{c.ratio} {c.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === AppTab.WEIGHTS && (
                    <div className="bg-white border-4 border-black rounded-[35px] shadow-2xl overflow-hidden">
                        <div className="p-8 bg-black text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-8 border-green-600">
                            <div>
                                <h2 className="text-3xl font-black">⚖️ المرجع المعياري</h2>
                                <p className="text-xs text-green-400 font-bold mt-1 uppercase tracking-widest">ثوابت التحويل المعتمدة</p>
                            </div>
                            <div className="bg-green-600 text-black px-6 py-3 font-black text-xl rounded-xl border-2 border-black">
                                {Object.keys(MATERIAL_WEIGHTS_DB).length} مادة مسجلة
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-neutral-100 text-black font-black text-[10px] uppercase border-b-2 border-black">
                                    <tr>
                                        <th className="p-6">كود المادة</th>
                                        <th className="p-6 text-center text-xl">الوزن المعتمد (كجم)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 font-black">
                                    {Object.entries(MATERIAL_WEIGHTS_DB).map(([code, weight]) => (
                                        <tr key={code} className="hover:bg-green-50 transition-all border-b border-neutral-50 last:border-0">
                                            <td className="p-6 text-neutral-500 font-mono text-sm">#{code}</td>
                                            <td className="p-6 text-center text-black text-4xl font-black">{weight}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === AppTab.SEARCH && (
                    <div className="space-y-8">
                        <div className="max-w-3xl mx-auto shadow-2xl border-4 border-black rounded-3xl overflow-hidden flex bg-white group focus-within:border-green-600 transition-all">
                            <span className="bg-black text-green-500 p-6 flex items-center text-3xl">🔍</span>
                            <input 
                                type="text"
                                className="w-full p-6 text-2xl font-black outline-none placeholder:text-neutral-200 text-black"
                                placeholder="ابحث باسم المنتج أو الكود..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        {searchTerm ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredSearch.map(p => (
                                    <div key={p.code} className="bg-white border-2 border-black rounded-[30px] shadow-lg flex flex-col group hover:border-green-600 transition-all overflow-hidden h-full">
                                        <div className="bg-black p-4 flex justify-between items-center">
                                            <span className={`text-[10px] px-3 py-1 font-black uppercase rounded-lg ${p.source === 'production' ? 'bg-green-600 text-black' : 'bg-neutral-800 text-green-400'}`}>
                                                {p.source === 'production' ? 'إنتاج' : 'تعبئة'}
                                            </span>
                                            <span className="text-[10px] font-mono text-neutral-500">#{p.code}</span>
                                        </div>
                                        <div className="p-6 flex-1">
                                            <h3 className="font-black text-xl mb-4 text-black border-r-8 border-green-600 pr-3 leading-tight">{p.name}</h3>
                                            <div className="space-y-2">
                                                {p.components.slice(0, 3).map((c: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-neutral-50 rounded-lg">
                                                        <span className="text-neutral-600 font-bold truncate max-w-[150px]">{c.name}</span>
                                                        <span className="font-black text-black">{c.ratio}</span>
                                                    </div>
                                                ))}
                                                {p.components.length > 3 && (
                                                    <p className="text-[10px] text-center text-neutral-300 font-bold italic pt-2">+ {p.components.length - 3} مكونات أخرى</p>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleAdd(p.code, p.source, p.source === 'production' ? 1000 : 100)}
                                            className="w-full bg-black text-green-500 py-5 font-black text-sm hover:bg-green-600 hover:text-white transition-all border-t-2 border-neutral-900 shadow-inner"
                                        >
                                            إضافة سريعة لليوم
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 grayscale opacity-10 flex flex-col items-center">
                                <span className="text-[150px]">🔎</span>
                                <p className="text-2xl font-black mt-4">محرك البحث المتطور</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Combined Mobile Toolbar - Takes full width at the bottom */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black text-white border-t-[6px] border-green-500 shadow-[0_-15px_40px_rgba(0,0,0,0.5)]">
                {/* Mode Selector (Production/Packaging) on Mobile */}
                <div className="flex bg-[#111] p-1 border-b border-neutral-800">
                    <button 
                        onClick={() => {setSystemMode('production'); setSelectedProducts([]);}}
                        className={`flex-1 py-3 text-[10px] font-black transition-all ${systemMode === 'production' ? 'bg-green-600 text-black shadow-lg rounded-md scale-95' : 'text-neutral-500'}`}
                    >
                        🏗️ قسم الإنتاج
                    </button>
                    <button 
                        onClick={() => {setSystemMode('packaging'); setSelectedProducts([]);}}
                        className={`flex-1 py-3 text-[10px] font-black transition-all ${systemMode === 'packaging' ? 'bg-green-600 text-black shadow-lg rounded-md scale-95' : 'text-neutral-500'}`}
                    >
                        📦 قسم التعبئة
                    </button>
                </div>
                
                {/* Main Action Tabs */}
                <nav className="flex justify-around items-center h-20">
                    <button onClick={() => setActiveTab(AppTab.PRODUCTION)} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === AppTab.PRODUCTION ? 'text-green-400 scale-110' : 'text-neutral-600'}`}>
                        <span className="text-2xl">🧮</span>
                        <span className="text-[8px] font-black uppercase">الحاسبة</span>
                    </button>
                    <button onClick={() => setActiveTab(AppTab.PRODUCTS)} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === AppTab.PRODUCTS ? 'text-green-400 scale-110' : 'text-neutral-600'}`}>
                        <span className="text-2xl">📋</span>
                        <span className="text-[8px] font-black uppercase">الأصناف</span>
                    </button>
                    <button onClick={() => setActiveTab(AppTab.SEARCH)} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === AppTab.SEARCH ? 'text-green-400 scale-110' : 'text-neutral-600'}`}>
                        <span className="text-2xl">🔍</span>
                        <span className="text-[8px] font-black uppercase">البحث</span>
                    </button>
                    <button onClick={exportReport} className="flex flex-col items-center justify-center bg-green-600 h-full px-6 active:bg-green-700 transition-colors border-l-4 border-green-700">
                        <span className="text-3xl text-black font-black">📥</span>
                        <span className="text-[8px] font-black text-black mt-1 uppercase">تقرير</span>
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default App;
