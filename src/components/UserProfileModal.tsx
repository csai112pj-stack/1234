import React, { useState } from 'react';
import { UserProfile, FitnessGoal, ActivityLevel } from '../types';
import { User, CheckCircle, Shield, Sparkles, Scale, HeartPulse, Trophy } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onSelectUser: (user: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'select'>('create');
  
  // 表單 State
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(25);
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(70);
  const [bodyFat, setBodyFat] = useState<number | undefined>(18);
  const [goal, setGoal] = useState<FitnessGoal>('muscle_gain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [pin, setPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCreateOrSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    const safeName = name.trim();
    if (!safeName) {
      setErrorMsg('請輸入使用者姓名或健身暱稱');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: safeName,
          gender,
          age: Number(age) || 25,
          height: Number(height) || 175,
          weight: Number(weight) || 70,
          body_fat_rate: bodyFat ? Number(bodyFat) : undefined,
          goal,
          activity_level: activityLevel,
          pin: pin ? pin.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        // 儲存至本地快取
        localStorage.setItem('nutrifit_user_id', data.user.id);
        localStorage.setItem('nutrifit_user', JSON.stringify(data.user));

        // 觸發父組件更新
        onSelectUser(data.user);

        // 👈 強制關閉彈窗 Modal
        onClose();

        // 重新整理頁面確保全域狀態與面板同步
        window.location.reload();
      } else {
        setErrorMsg(data.error || '無法建立或切換使用者');
      }
    } catch (err: any) {
      console.error('使用者操作失敗:', err);
      setErrorMsg('伺服器連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">切換 / 登入或新增檔案</h2>
              <p className="text-xs text-slate-400 mt-0.5">自動計算您的每日 BMR / TDEE 與三大營養素目標</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab 頁籤 */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> 快速建立 / 暱稱切換
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateOrSelect} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              ⚠️️ {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              使用者姓名 / 健身暱稱：<span className="text-rose-500">*必填</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Alex、小智、健身新手小陳"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">性別</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">年齡 (歲)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">身高 (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">體重 (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">健身目標</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGoal('muscle_gain')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  goal === 'muscle_gain'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400'
                }`}
              >
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-bold text-sm">增肌 (Muscle Gain)</div>
                  <div className="text-[11px] opacity-70">TDEE +300 kcal, 高蛋白</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setGoal('fat_loss')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  goal === 'fat_loss'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400'
                }`}
              >
                <HeartPulse className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-bold text-sm">減脂 (Fat Loss)</div>
                  <div className="text-[11px] opacity-70">TDEE -400 kcal, 赤字控制</div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? '儲存設定中...' : '完成選擇，開始使用'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
