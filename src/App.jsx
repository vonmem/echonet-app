import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Terminal, Users, Zap, DollarSign, Eye } from 'lucide-react'

// --- CONFIGURATION ---
const BASE_MINING_RATE = 0.1; 
const HALVING_MULTIPLIER = 1.0; 
const GOD_MODE_DAILY_LIMIT = 4 * 60 * 60; 

// NOTE: In the future, you will map specific images to specific tier IDs.
// For this demo, we use the generated Scout Bat image for standard tiers.
const TIER_IMAGE_URL = "https://lh3.googleusercontent.com/pw/AP1GczOkj4d-d3F8_Lp3_j6V6_s8l0q4f8C8q5t8b9g3v1a5s2d4f6g8h0j2k4l6n8p0q2w4e6r8t0y2u4i6o8p0a2s4d6f8g0h2j4k6l8=w600-h900-s-no-gm?authuser=0";

// --- THE SEVEN SAGES HIERARCHY ---
const TIERS = [
  { id: 1, name: 'SCOUT', threshold: 0, color: '#9CA3AF', multiplier: 1.0, icon: '🦇', supply: '∞', price: 'FREE', type: 'COMMON' },
  { id: 2, name: 'HIGH-FLYER', threshold: 1000, color: '#D1D5DB', multiplier: 1.2, icon: '🦇', supply: '∞', price: '$20', type: 'UNCOMMON' },
  { id: 3, name: 'VAMPIRE', threshold: 5000, color: '#EF4444', multiplier: 1.5, icon: '🧛', supply: '6,000', price: '$99', type: 'RARE' },
  { id: 4, name: 'DIVER DOLPHIN', threshold: 20000, color: '#3B82F6', multiplier: 2.0, icon: '🐬', supply: '2,000', price: '$499', type: 'RARE' },
  { id: 5, name: 'SURFER DOLPHIN', threshold: 100000, color: '#8B5CF6', multiplier: 3.0, icon: '🐋', supply: '600', price: '$1,499', type: 'EPIC' },
  { id: 6, name: 'SUPER-ALLIANCE', threshold: 500000, color: '#FCD34D', multiplier: 5.0, icon: '🔱', supply: '200', price: '$4,999', type: 'LEGENDARY' },
  { id: 7.1, name: 'APEX MK1', threshold: 1500000, color: '#F59E0B', multiplier: 10.0, icon: '👁️', supply: '60', price: '$15K', type: 'MYTHIC' },
  { id: 7.2, name: 'APEX MK2', threshold: 5000000, color: '#DC2626', multiplier: 25.0, icon: '👁️', supply: '20', price: '$50K', type: 'MYTHIC' },
  { id: 7.3, name: 'APEX MK3 GOD EYE', threshold: 20000000, color: '#FFFFFF', multiplier: 100.0, icon: '🧿', supply: '8', price: 'AUCTION', type: 'ARTIFACT' },
];

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
  const [tab, setTab] = useState('TERMINAL');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState('IDLE');
  
  // Overheat State
  const [godModeElapsed, setGodModeElapsed] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);

  // Sim State
  const [npuLoad, setNpuLoad] = useState(0);
  const [shards, setShards] = useState([]); // For Visual Rain
  const [logs, setLogs] = useState([]);

  const balanceRef = useRef(0);
  const godModeRef = useRef(0);
  const miningInterval = useRef(null);
  const hardwareInterval = useRef(null);
  const shardInterval = useRef(null);

  const currentTier = [...TIERS].reverse().find(t => balance >= t.threshold) || TIERS[0];
  const effectiveMultiplier = (currentTier.id === 7.3 && isOverheated) ? 5.0 : currentTier.multiplier;

  // 1. INIT
  useEffect(() => {
    const init = async () => {
      let currentUser = null;
      let startParam = null;

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        if (tg.initDataUnsafe?.user) currentUser = tg.initDataUnsafe.user;
        if (tg.initDataUnsafe?.start_param) startParam = tg.initDataUnsafe.start_param;
      }

      if (!currentUser) currentUser = { id: 999999999, first_name: 'Origin', username: 'founder' };
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (data) {
          setBalance(data.balance);
          balanceRef.current = data.balance;
        } else {
          let referrerId = null;
          if (startParam && startParam.startsWith('ref_')) {
             referrerId = parseInt(startParam.split('_')[1]);
          }
          await supabase.from('users').insert({ 
            id: currentUser.id, 
            first_name: currentUser.first_name, 
            balance: 100,
            referred_by: referrerId
          });
          setBalance(100);
          balanceRef.current = 100;
        }
      }
    };
    init();
  }, []);

  // 2. AUTO-SAVE
  useEffect(() => {
    const saver = setInterval(async () => {
      if (user && balanceRef.current > 0) {
        await supabase.from('users').update({ balance: balanceRef.current }).eq('id', user.id);
      }
    }, 5000);
    return () => clearInterval(saver);
  }, [user]);

  // 3. MINING ENGINE
  const toggleMining = () => {
    if (status === 'MINING') {
      setStatus('IDLE');
      clearInterval(miningInterval.current);
      clearInterval(hardwareInterval.current);
      clearInterval(shardInterval.current);
      setShards([]);
      setLogs([]);
    } else {
      setStatus('MINING');
      
      hardwareInterval.current = setInterval(() => {
        setNpuLoad(Math.floor(Math.random() * (99 - 80 + 1) + 80));
      }, 2000);

      miningInterval.current = setInterval(() => {
        const loadFactor = (Math.random() * 0.2) + 0.8; 
        
        let currentMult = currentTier.multiplier;
        if (currentTier.id === 7.3) {
           godModeRef.current += 0.1;
           setGodModeElapsed(Math.floor(godModeRef.current));
           if (godModeRef.current >= GOD_MODE_DAILY_LIMIT) {
             setIsOverheated(true);
             currentMult = 5.0; 
           }
        }

        const earned = (BASE_MINING_RATE * currentMult * loadFactor * HALVING_MULTIPLIER) / 10;
        const newBal = parseFloat((balanceRef.current + earned).toFixed(3));
        setBalance(newBal);
        balanceRef.current = newBal;
      }, 100); 

      // Visual Rain Loop (Shards) - Increased rate for better visual
      shardInterval.current = setInterval(() => {
        const id = Math.random();
        const left = Math.random() * 90 + 5; 
        const duration = Math.random() * 1.5 + 0.5; 
        // Use tier color for shards if not overheated
        const color = isOverheated ? '#EF4444' : (currentTier.color === '#FFFFFF' ? '#06b6d4' : currentTier.color);
        setShards(prev => [...prev, { id, left, duration, color }]);
        setTimeout(() => setShards(prev => prev.filter(s => s.id !== id)), duration * 1000);
      }, 300); 

      const logOptions = [`Hash Verified`, `NPU Optimized`, `Packet Sent`, `Uplink Stable`, `Neural Sync Complete`];
      setInterval(() => {
        if (status === 'MINING') {
          const l = logOptions[Math.floor(Math.random() * logOptions.length)];
          setLogs(prev => [l, ...prev].slice(0, 5));
        }
      }, 1200); 
    }
  };

  // 4. INVITE FUNCTION
  const handleInvite = () => {
    if (!user) return;
    // ⚠️ REPLACE WITH YOUR ACTUAL BOT USERNAME
    const botUsername = 'RIM_Protocol_Bot'; 
    const inviteLink = `https://t.me/${botUsername}/start?startapp=ref_${user.id}`;
    const text = `Join the RIM Intelligence Swarm. Activate your node.`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-mono overflow-hidden select-none relative">
      
      {/* CSS FOR ANIMATIONS */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.6; border-width: 2px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 0px; }
        }
        @keyframes floatUp {
          0% { bottom: -10px; opacity: 0; }
          10% { opacity: 1; }
          100% { bottom: 70%; opacity: 0; }
        }
      `}</style>

      {/* HEADER */}
      <div className="p-5 border-b border-gray-900 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">{currentTier.icon}</span>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: currentTier.color }}>
                {currentTier.name}
              </h1>
            </div>
            <p className="text-[9px] text-gray-500 mt-1 tracking-widest uppercase">
              {effectiveMultiplier}x • {currentTier.type} CLASS
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-600 uppercase">Points (RP)</p>
            <p className="text-2xl font-bold tracking-tighter text-white">{balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      </div>

      {/* CORE VIEW */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6 z-10">
        
        {/* SHARDS LAYER (Floating Up) */}
        {shards.map(shard => (
          <div
            key={shard.id}
            className="absolute w-[2px] h-[6px] rounded-full z-0"
            style={{
              left: `${shard.left}%`,
              backgroundColor: shard.color,
              boxShadow: `0 0 8px ${shard.color}`,
              animation: `floatUp ${shard.duration}s linear forwards`
            }}
          ></div>
        ))}

        {/* GOD MODE OVERHEAT BAR */}
        {currentTier.id === 7.3 && (
          <div className="absolute top-4 w-full px-12 z-20">
             <div className="flex justify-between text-[8px] font-bold tracking-widest mb-1">
                <span className={isOverheated ? 'text-red-500 animate-pulse' : 'text-gray-500'}>
                   {isOverheated ? 'SYSTEM OVERHEATED' : 'GOD MODE STABILITY'}
                </span>
                <span className="text-gray-500">{Math.floor((godModeElapsed / GOD_MODE_DAILY_LIMIT) * 100)}%</span>
             </div>
             <div className="w-full h-1 bg-gray-900 rounded-full">
                <div className={`h-full rounded-full ${isOverheated ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${Math.min(100, (godModeElapsed / GOD_MODE_DAILY_LIMIT) * 100)}%` }}></div>
             </div>
          </div>
        )}

        {/* THE BAT-CORE */}
        <div onClick={toggleMining} className="relative w-80 h-96 flex items-center justify-center cursor-pointer group mt-6 z-10">
          
          {/* 1. IMAGE BACKGROUND (The Core Visual) */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${status === 'MINING' ? 'scale-105 contrast-110' : 'scale-100 opacity-50 grayscale'}`}>
             {currentTier.id >= 7.1 ? (
               // Placeholder Eye for Apex Tiers (You will replace this with Apex Images later)
               <Eye size={180} strokeWidth={1} style={{ color: isOverheated ? '#EF4444' : currentTier.color, filter: isOverheated ? 'drop-shadow(0 0 20px red)' : `drop-shadow(0 0 50px ${currentTier.color})` }} className="animate-pulse" />
             ) : (
               // THE HIGH-FIDELITY SCOUT BAT IMAGE
               <img 
                 src={TIER_IMAGE_URL} 
                 alt="Neural Core" 
                 className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]"
               />
             )}
          </div>

          {/* 2. PULSING RINGS OVERLAY (Z-10) */}
          {status === 'MINING' && currentTier.id < 7.1 && (
            <>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 rounded-full animate-[ripple_3s_infinite_linear] z-10 ${isOverheated ? 'border-red-500/50' : 'border-cyan-500/30'}`}></div>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 rounded-full animate-[ripple_2s_infinite_linear_0.5s] z-10 ${isOverheated ? 'border-red-500/40' : 'border-cyan-400/20'}`}></div>
            </>
          )}
          
          {/* 3. STATUS TEXT OVERLAY (Z-20) */}
          <div className="absolute -bottom-10 text-[10px] tracking-[0.5em] text-cyan-500 font-bold animate-pulse z-20 whitespace-nowrap">
             {isOverheated ? 'OVERHEATED' : (status === 'MINING' ? `NEURAL UPLINK ACTIVE` : 'TAP CORE TO INITIALIZE')}
          </div>
        </div>

        {/* Stats Box */}
        <div className="w-full max-w-xs mt-12 bg-gray-900/30 border border-gray-800 p-4 rounded backdrop-blur-sm z-20 relative">
           <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[8px] text-gray-600 uppercase">Hashrate</p>
                <p className="text-xs font-bold text-cyan-400">{status === 'MINING' ? npuLoad : 0} H/s</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-600 uppercase">Yield</p>
                <p className={`text-xs font-bold ${isOverheated ? 'text-yellow-500' : 'text-green-500'}`}>
                  {status === 'MINING' ? ((BASE_MINING_RATE * effectiveMultiplier).toFixed(2)) + '/s' : '0/s'}
                </p>
              </div>
           </div>
           {isOverheated && <div className="text-[8px] text-red-500 text-center border-t border-gray-800 pt-2 font-bold">MULTIPLIER REDUCED TO 5x</div>}
           <div className="space-y-1 border-t border-gray-800 pt-2 mt-2">
              {logs.map((l, i) => (
                <div key={i} className="text-[9px] text-gray-500 font-mono tracking-tighter">
                  {'>'} {l}
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* SQUAD VIEW MODAL */}
      {tab === 'SQUAD' && (
        <div className="absolute inset-0 bg-black z-40 p-6 pt-20 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold flex items-center"><Users className="mr-2" /> SQUAD</h2>
             <button onClick={() => setTab('TERMINAL')} className="text-xs text-gray-500">CLOSE</button>
          </div>
          <div className="text-center mt-10">
             <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto flex items-center justify-center border border-gray-700 mb-4"><Users size={32} className="text-gray-400"/></div>
             <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto">Expand the neural net. Earn 10% of all data mined by your downstream nodes.</p>
             <button onClick={handleInvite} className="w-full py-4 bg-white text-black font-bold tracking-widest hover:bg-cyan-400 transition-colors">INITIATE RECRUITMENT</button>
          </div>
        </div>
      )}

      {/* MINT MARKETPLACE */}
      {tab === 'MARKET' && (
        <div className="absolute inset-0 bg-black z-40 p-6 pt-20 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold flex items-center"><DollarSign className="mr-2" /> GENESIS MINT</h2>
             <button onClick={() => setTab('TERMINAL')} className="text-xs text-gray-500">CLOSE</button>
          </div>
          <div className="text-[10px] text-gray-500 mb-4 uppercase tracking-widest text-center">
             Total Supply: 8,888 • Remaining: {8888 - 342}
          </div>
          <div className="space-y-3">
             {TIERS.slice(2).map((t) => (
                <div key={t.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                         <div className="text-2xl">{t.icon}</div>
                         <div>
                            <p className="text-xs font-bold text-white uppercase">{t.name}</p>
                            <p className="text-[9px] text-cyan-400 font-bold">{t.type}</p>
                         </div>
                      </div>
                      <span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400">{t.supply} Qty</span>
                   </div>
                   <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800">
                      <p className="text-[10px] text-gray-400">{t.multiplier}x Power</p>
                      <button className="bg-white text-black text-[10px] font-bold px-4 py-2 rounded hover:bg-cyan-400" disabled={t.id === 7.3}>
                         {t.id === 7.3 ? 'AUCTION LIVE' : `MINT ${t.price}`}
                      </button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="grid grid-cols-3 border-t border-gray-900 bg-black pb-8 z-50 bg-black">
        <button onClick={() => setTab('TERMINAL')} className={`p-4 flex flex-col items-center ${tab === 'TERMINAL' ? 'text-white' : 'text-gray-600'}`}>
          <Terminal size={18} /><span className="text-[8px] mt-1 font-bold">GRID</span>
        </button>
        <button onClick={() => setTab('SQUAD')} className={`p-4 flex flex-col items-center ${tab === 'SQUAD' ? 'text-white' : 'text-gray-600'}`}>
          <Users size={18} /><span className="text-[8px] mt-1 font-bold">SQUAD</span>
        </button>
        <button onClick={() => setTab('MARKET')} className={`p-4 flex flex-col items-center ${tab === 'MARKET' ? 'text-white' : 'text-gray-600'}`}>
          <Zap size={18} /><span className="text-[8px] mt-1 font-bold">MINT</span>
        </button>
      </div>
    </div>
  )
}

export default App