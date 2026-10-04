import React, { useState, useEffect } from 'react';
import { UserProfile, FitnessGoal, ActivityLevel } from '../types';
import { User, CheckCircle, Shield, Sparkles, Scale, HeartPulse, Trophy, Users, KeyRound, Activity } from 'lucide-react';

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
  const [name, setName] = useState(currentUser?.name || '');
  const [gender, setGender] = useState<'male' | 'female'>(currentUser?.gender || 'male');
  const [age, setAge] = useState<number>(currentUser?.age || 25);
  const [height, setHeight] = useState<number>(currentUser?.height || 175);
  const [weight, setWeight] = useState<number>(currentUser?.weight || 70);
  const [bodyFat, setBodyFat] = useState<number | undefined>(currentUser?.body_fat_rate || 18);
  const [goal, setGoal] = useState<FitnessGoal>(currentUser?.goal || 'fat_loss');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(currentUser?.activity_level || 'moderate');
  const [pin, setPin] = useState(currentUser?.pin || '');

  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 載入可切換的使用者清單
  useEffect(() => {
    if (isOpen) {
      fetch('/api/user')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setUserList(data.users);
        })
        .catch((err) => console.error('無法取得使用者清單:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 試算 BMR / TDEE
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));
  const targetCalories = goal === 'muscle_gain' ? tdee + 300 : tdee - 400;
  const targetProtein = Math.round((targetCalories * 0.3) / 4);

  // 送出表單到 Vercel 後端 API
  const handleSubmit = async (e: React.FormEvent) => {
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
          id: currentUser?.id,
          name: safeName,
          gender,
          age: Number(age) || 25,
          height: Number(height) || 175,
          weight: Number(weight) || 70,
          body_fat_rate: bodyFat ? Number(bodyFat) : undefined,
          goal,
          activity_level: activityLevel,
          pin: pin ? pin.trim() : undefined,
          bmr: Math.round(bmr),
          tdee: tdee,
          target_calories: targetCalories,
          target_protein: targetProtein,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        localStorage.setItem('nutrifit_user_id', data.user.id);
        localStorage.setItem('nutrifit_user', JSON.stringify(data.user));

        onSelectUser(data.user);
        onClose(); // 👈 關閉 Modal 彈窗
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

  // 切換已存在的使用者
  const handleSelectExistingUser = (selectedUser: UserProfile) => {
    localStorage.setItem('nutrifit_user_id', selectedUser.id);
    localStorage.setItem('nutrifit_user', JSON.stringify(selectedUser));
    onSelectUser(selectedUser);
    onClose(); // 👈 關閉 Modal 彈窗
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
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
            <Sparkles className="w-4 h-4" /> 快速建立 / 編輯檔案
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('select')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'select'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> 切換現有身份 ({userList.length})
          </button>
        </div>

        {/* Tab 1: 建立/編輯檔案 */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
                ⚠️ {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                使用者姓名 / 暱稱：<span className="text-rose-500">*必填</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Alex"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">日常活動量等級</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500"
              >
                <option value="sedentary">久坐少動 (幾乎不運動，乘數 1.2)</option>
                <option value="light">輕度活動 (每周運動 1-2 天，乘數 1.375)</option>
                <option value="moderate">中度規律訓練 (每周重訓 3-5 天，乘數 1.55)</option>
                <option value="active">高度運動 (每周訓練 6-7 天，乘數 1.725)</option>
                <option value="very_active">極高強度 (專業運動員/高體能工作，乘數 1.9)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" /> 個人同步防護 PIN 碼 (可選)：
                </label>
                <span className="text-[11px] text-slate-500">設定後跨裝置登入需驗證</span>
              </div>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-6 位數數字 (若不想加密防護可留空)"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-600 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">健身目標</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="muscle_gain">增肌 (Muscle Gain)</option>
                  <option value="fat_loss">減脂 (Fat Loss)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">性別</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">身高 (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">體重 (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">年齡 (歲)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm"
                />
              </div>
            </div>

            {/* 即時計算結果 preview 卡片 */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[11px] text-slate-400">基礎代謝 BMR</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{Math.round(bmr)} kcal</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">每日消耗 TDEE</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">{tdee} kcal</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">目標控制熱量</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{targetCalories} kcal</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? '儲存中...' : '完成選擇，開始使用'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: 切換現有身份 */}
        {activeTab === 'select' && (
          <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
            {userList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                目前尚無其他建立的使用者資料
              </div>
            ) : (
              userList.map((u) => {
                const isCurrent = currentUser?.id === u.id || currentUser?.name === u.name;
                return (
                  <div
                    key={u.id || u.name}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-100">
                        {u.name}
                        <span className="text-xs font-normal text-slate-400">
                          ({u.gender === 'male' ? '男' : '女'} · {u.age}歲)
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        身高 {u.height}cm / 體重 {u.weight}kg | 目標: {u.target_calories || u.tdee} kcal
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectExistingUser(u)}
                      disabled={isCurrent}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                          : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                      }`}
                    >
                      {isCurrent ? '使用中' : '切換'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
};
