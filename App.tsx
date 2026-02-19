
import React, { useState, useEffect, useMemo } from 'react';
import { Language, AttendanceEntry, AttendanceStatus, PeriodType } from './types';
import { translations } from './translations';

const App: React.FC = () => {
  const language: Language = 'ar';

  // Persistent States
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('v4_emp_name') || '');
  const [dailySalary, setDailySalary] = useState(() => Number(localStorage.getItem('v4_daily_sal')) || 0);
  const [periodType, setPeriodType] = useState<PeriodType>(() => (localStorage.getItem('v4_period_type') as PeriodType) || '2w');
  const [entries, setEntries] = useState<AttendanceEntry[]>(() => {
    const saved = localStorage.getItem('v4_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFinalized, setIsFinalized] = useState(() => localStorage.getItem('v4_finalized') === 'true');
  const [setupConfirmed, setSetupConfirmed] = useState(() => !!localStorage.getItem('v4_setup_done'));

  // Derived Period Length
  const periodLength = useMemo(() => {
    switch (periodType) {
      case '1w': return 7;
      case '2w': return 14;
      case '3w': return 21;
      case '1m': return 30;
      default: return 14;
    }
  }, [periodType]);

  // Local Form States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('present');
  const [isManual, setIsManual] = useState(false);
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeTo, setTimeTo] = useState('16:30');
  const [manualHours, setManualHours] = useState(8);
  const [dailyBonus, setDailyBonus] = useState(0);
  const [dailyDeduction, setDailyDeduction] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('v4_emp_name', employeeName);
    localStorage.setItem('v4_daily_sal', dailySalary.toString());
    localStorage.setItem('v4_period_type', periodType);
    localStorage.setItem('v4_entries', JSON.stringify(entries));
    localStorage.setItem('v4_finalized', isFinalized.toString());
    localStorage.setItem('v4_setup_done', setupConfirmed ? 'true' : '');
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, [employeeName, dailySalary, periodType, entries, isFinalized, setupConfirmed]);

  const t = (key: string) => translations[key]?.[language] || key;

  const calculateDailyPay = () => {
    let netHours = 0;
    let basePay = 0;

    if (currentStatus === 'present') {
      if (isManual) {
        netHours = manualHours;
      } else {
        const [h1, m1] = timeFrom.split(':').map(Number);
        const [h2, m2] = timeTo.split(':').map(Number);
        const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        const totalHours = diffMinutes / 60;
        netHours = Math.max(0, totalHours - 0.5); // 0.5 lunch deduction
      }
      const hourlyRate = dailySalary / 8;
      basePay = netHours * hourlyRate;
    }

    const finalPay = basePay + dailyBonus - dailyDeduction;
    return { pay: finalPay, net: netHours };
  };

  const handleConfirmSetup = () => {
    if (!employeeName.trim() || dailySalary <= 0) {
      alert(language === 'ar' ? 'يرجى إكمال البيانات الأساسية أولاً' : 'Please complete basic setup');
      return;
    }
    setSetupConfirmed(true);
  };

  const handleSaveDay = () => {
    if (entries.some(e => e.date === selectedDate)) {
      alert(t('duplicateDate'));
      return;
    }

    const { pay, net } = calculateDailyPay();
    if (currentStatus === 'present' && net <= 0) {
      alert(language === 'ar' ? 'يرجى إدخال ساعات عمل صحيحة' : 'Invalid working hours');
      return;
    }

    const newEntry: AttendanceEntry = {
      id: crypto.randomUUID(),
      date: selectedDate,
      status: currentStatus,
      checkIn: isManual || currentStatus === 'absent' ? undefined : timeFrom,
      checkOut: isManual || currentStatus === 'absent' ? undefined : timeTo,
      manualHours: isManual ? manualHours : undefined,
      isManual,
      bonus: dailyBonus,
      deduction: dailyDeduction,
      calculatedPay: pay,
      netHours: net
    };

    setEntries([...entries, newEntry]);
    
    // Clear daily adjustments
    setDailyBonus(0);
    setDailyDeduction(0);

    // Feedback & Auto increment date
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }, 600);
  };

  const removeEntry = (id: string) => {
    if (isFinalized) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  const totals = useMemo(() => {
    return entries.reduce((acc, curr) => ({
      present: acc.present + (curr.status === 'present' ? 1 : 0),
      absent: acc.absent + (curr.status === 'absent' ? 1 : 0),
      salary: acc.salary + curr.calculatedPay,
      hours: acc.hours + curr.netHours,
      bonus: acc.bonus + curr.bonus,
      deduction: acc.deduction + curr.deduction
    }), { present: 0, absent: 0, salary: 0, hours: 0, bonus: 0, deduction: 0 });
  }, [entries]);

  const reset = () => {
    if (window.confirm(t('confirmReset'))) {
      setEntries([]);
      setIsFinalized(false);
      setEmployeeName('');
      setDailySalary(0);
      setSetupConfirmed(false);
      setPeriodType('2w');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">🇪🇬</div>
            <h1 className="text-xl font-black text-indigo-700 dark:text-indigo-400">{t('appTitle')}</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm active:scale-90 transition-transform">
            {isDarkMode ? '🌞' : '🌙'}
          </button>
        </header>

        {!setupConfirmed && !isFinalized ? (
          /* Step 1: Setup */
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-black mb-2">{t('setupTitle')}</h2>
              <p className="text-sm text-slate-400">أدخل بيانات الموظف والمدة لبدء التسجيل</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block mr-1">{t('employeeName')}</label>
                <input 
                  type="text" 
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-lg transition-all"
                  value={employeeName}
                  onChange={e => setEmployeeName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block mr-1">{t('dailySalary')}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-lg transition-all pl-16"
                    value={dailySalary || ''}
                    onChange={e => setDailySalary(Number(e.target.value))}
                    placeholder="0.00"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{t('currency')}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block mr-1">{t('periodSelection')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['1w', '2w', '3w', '1m'] as PeriodType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setPeriodType(type)}
                      className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${periodType === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400'}`}
                    >
                      {t(`period${type}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={handleConfirmSetup}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
            >
              بدء تسجيل الحضور →
            </button>
          </div>
        ) : !isFinalized ? (
          /* Step 2: Daily Tracking */
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl flex justify-between items-center shadow-sm border dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">👤</div>
                <div className="flex flex-col">
                  <span className="font-black text-slate-700 dark:text-slate-200 text-sm leading-none mb-1">{employeeName}</span>
                  <span className="text-[10px] text-indigo-500 font-bold uppercase">{t(`period${periodType}`)}</span>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-full">
                {t('dayCounter')} {entries.length + 1} / {periodLength}
              </span>
            </div>

            {entries.length < periodLength ? (
              <div className={`bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border dark:border-slate-800 space-y-6 relative transition-all duration-300 ${showSuccess ? 'scale-[0.98] opacity-50' : ''}`}>
                
                {showSuccess && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 z-20 rounded-3xl backdrop-blur-[1px]">
                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black animate-bounce shadow-lg">تم الحفظ! ✅</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 block mr-1">{t('date')}</label>
                    <input type="date" className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-transparent focus:border-indigo-500 outline-none font-bold" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-5">
                    <button onClick={() => setCurrentStatus('present')} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${currentStatus === 'present' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400'}`}>{t('present')}</button>
                    <button onClick={() => setCurrentStatus('absent')} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${currentStatus === 'absent' ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400'}`}>{t('absent')}</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 block mr-1">{t('bonus')}</label>
                    <input type="number" className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-emerald-600 border border-emerald-100 dark:border-emerald-900/30" value={dailyBonus || ''} onChange={e => setDailyBonus(Number(e.target.value))} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1 block mr-1">{t('deduction')}</label>
                    <input type="number" className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-red-600 border border-red-100 dark:border-red-900/30" value={dailyDeduction || ''} onChange={e => setDailyDeduction(Number(e.target.value))} placeholder="0" />
                  </div>
                </div>

                {currentStatus === 'present' && (
                  <div className="space-y-4 pt-4 border-t dark:border-slate-800 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-xs text-slate-500">{t('attendanceQuestion')}</h3>
                      <button onClick={() => setIsManual(!isManual)} className="text-[10px] font-bold text-indigo-500 underline uppercase tracking-widest">{isManual ? 'ساعات العمل التلقائية' : t('manualEntry')}</button>
                    </div>

                    {!isManual ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block mr-1">{t('checkIn')}</label>
                          <input type="time" className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block mr-1">{t('checkOut')}</label>
                          <input type="time" className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block mr-1">{t('hoursCount')}</label>
                        <input type="number" step="0.5" className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-black text-xl text-center text-indigo-600" value={manualHours} onChange={e => setManualHours(Number(e.target.value))} />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 italic text-center">💡 {t('lunchNote')}</p>
                  </div>
                )}

                <button 
                  onClick={handleSaveDay} 
                  disabled={showSuccess}
                  className="w-full bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {t('saveDay')}
                </button>
              </div>
            ) : (
              <div className="bg-indigo-700 p-8 rounded-3xl text-white text-center shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="text-4xl mb-4">🏆</div>
                <h2 className="text-2xl font-black mb-2">اكتملت الفترة!</h2>
                <p className="text-indigo-200 mb-8 text-sm">تم تسجيل جميع الأيام الـ {periodLength} بنجاح.</p>
                <button 
                  onClick={() => setIsFinalized(true)} 
                  className="w-full bg-white text-indigo-700 font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-50 transition-all active:scale-95"
                >
                  {t('finishAndCalculate')}
                </button>
              </div>
            )}

            {/* Daily History (Mini cards) */}
            <div className="space-y-3 pt-4 border-t dark:border-slate-800">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">سجل الأيام السابقة</h4>
              {entries.slice().reverse().map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 flex justify-between items-center shadow-sm">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{e.date}</div>
                    <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2">
                      {e.status === 'present' ? (
                        <span className="text-emerald-500 font-bold">{e.netHours.toFixed(1)} ساعة</span>
                      ) : (
                        <span className="text-red-400 font-bold">{t('absent')}</span>
                      )}
                      {(e.bonus > 0 || e.deduction > 0) && (
                        <span className="opacity-40">|</span>
                      )}
                      {e.bonus > 0 && <span className="text-emerald-600 font-bold">+{e.bonus}</span>}
                      {e.deduction > 0 && <span className="text-red-600 font-bold">-{e.deduction}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                       <div className="font-black text-sm text-slate-800 dark:text-slate-100">{e.calculatedPay.toFixed(0)} <span className="text-[10px] font-normal opacity-50">{t('currency')}</span></div>
                    </div>
                    <button onClick={() => removeEntry(e.id)} className="text-slate-200 hover:text-red-500 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Step 3: Detailed Report */
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-indigo-700 dark:bg-indigo-900 p-8 rounded-[3rem] text-white text-center shadow-2xl border-4 border-white dark:border-slate-900 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2 opacity-70">{t('totalSalary')}</p>
                <h2 className="text-6xl font-black mb-6 tracking-tight">
                  {totals.salary.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                  <span className="text-xl mr-2 font-normal opacity-50">{t('currency')}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-white/10 pt-6">
                  <div className="text-center">
                    <div className="text-[10px] opacity-60 uppercase font-black">{t('presentDays')}</div>
                    <div className="text-xl font-black">{totals.present}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] opacity-60 uppercase font-black">{t('hoursCount')}</div>
                    <div className="text-xl font-black">{totals.hours.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] opacity-60 uppercase font-black text-emerald-300">+{t('bonus')}</div>
                    <div className="text-xl font-black">{totals.bonus}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] opacity-60 uppercase font-black text-red-300">-{t('deduction')}</div>
                    <div className="text-xl font-black">{totals.deduction}</div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-24 -mb-24" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('summaryReport')}</h3>
                <div className="text-right">
                   <div className="text-[10px] font-bold text-slate-300 leading-none">{employeeName}</div>
                   <div className="text-[8px] font-bold text-indigo-400 uppercase">{t(`period${periodType}`)}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b dark:border-slate-800">
                      <th className="pb-4 px-2 font-black">{t('date')}</th>
                      <th className="pb-4 px-2 font-black text-center">{t('status')}</th>
                      <th className="pb-4 px-2 font-black text-center">أخرى</th>
                      <th className="pb-4 px-2 font-black">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {entries.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-2 font-bold text-slate-600 dark:text-slate-400">{e.date}</td>
                        <td className="py-4 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${e.status === 'present' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {t(e.status)}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-center">
                           <div className="flex flex-col gap-0.5">
                             {e.bonus > 0 && <span className="text-[9px] text-emerald-500 font-bold">+{e.bonus}</span>}
                             {e.deduction > 0 && <span className="text-[9px] text-red-500 font-bold">-{e.deduction}</span>}
                             {!e.bonus && !e.deduction && <span className="text-slate-200">-</span>}
                           </div>
                        </td>
                        <td className="py-4 px-2 font-black text-slate-800 dark:text-slate-200">{e.calculatedPay.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              onClick={reset} 
              className="w-full bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-red-500 font-black py-5 rounded-2xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900"
            >
              {t('resetAll')}
            </button>
          </div>
        )}
        
        <footer className="mt-12 text-center text-slate-300 dark:text-slate-800 text-[10px] font-black uppercase tracking-widest">
          Simple Payroll System &bull; Period Logic &bull; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

export default App;
