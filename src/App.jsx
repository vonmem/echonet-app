import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURATION ---
const SHARD_SPAWN_RATE = 800; // New shard every 800ms
const EARNING_RATE = 0.5; // RIM earned per second
const SAVE_INTERVAL = 5000; // Save to DB every 5 seconds

// --- SUPABASE SETUP ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// --- MOCK TASKS (What the shards reveal when clicked) ---
const TASKS = [
  "Sentiment Analysis: Verified",
  "Vector Embedding: Complete",
  "Node Latency: 12ms",
  "Hash Validated: 0x8F...2A",
  "Neural Weight Updated",
  "Pattern Match: 98.4%",
  "Swarm Sync: Active",
  "Data Fragment: Encrypted"
];

function App() {
  const [status, setStatus] = useState('IDLE') // IDLE, MINING
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [shards, setShards] = useState([])
  const [popups, setPopups] = useState([]) // For the task reveals
  
  const balanceRef = useRef(0)
  const miningInterval = useRef(null)
  const shardInterval = useRef(null)

  // 1. INITIALIZATION & IDENTITY
  useEffect(() => {
    const init = async () => {
      let currentUser = null
      
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp
        tg.ready()
        tg.expand()
        tg.setHeaderColor('#000000')
        tg.setBackgroundColor('#000000')
        if (tg.initDataUnsafe?.user) currentUser = tg.initDataUnsafe.user
      }

      if (!currentUser) {
        currentUser = { id: 999999999, first_name: 'Guest', username: 'browser_test' }
      }

      setUser(currentUser)
      
      // Load Balance
      if (currentUser) {
        const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single()
        if (data) {
          setBalance(data.balance)
          balanceRef.current = data.balance
        } else {
          // Create user if not exists
          await supabase.from('users').insert({ id: currentUser.id, first_name: currentUser.first_name, balance: 1000 })
          setBalance(1000)
          balanceRef.current = 1000
        }
      }
    }
    init()
  }, [])

  // 2. AUTO-SAVER (Background Heartbeat)
  useEffect(() => {
    const saver = setInterval(async () => {
      if (user && balanceRef.current > 0) {
        await supabase.from('users').update({ balance: balanceRef.current }).eq('id', user.id)
      }
    }, SAVE_INTERVAL)
    return () => clearInterval(saver)
  }, [user])

  // 3. MINING ENGINE LOGIC
  const toggleMining = () => {
    if (status === 'MINING') {
      // STOP MINING
      setStatus('IDLE')
      clearInterval(miningInterval.current)
      clearInterval(shardInterval.current)
      setShards([]) // Clear shards
    } else {
      // START MINING
      setStatus('MINING')
      
      // A. Passive Earning
      miningInterval.current = setInterval(() => {
        const increment = EARNING_RATE / 10 // Update 10 times a second for smoothness
        const newBal = parseFloat((balanceRef.current + increment).toFixed(3))
        setBalance(newBal)
        balanceRef.current = newBal
      }, 100)

      // B. Spawn Shards (The "Rain")
      shardInterval.current = setInterval(() => {
        const id = Math.random()
        const left = Math.random() * 80 + 10; // Random position 10% to 90% width
        const duration = Math.random() * 3 + 2; // 2-5 seconds float time
        
        setShards(prev => [...prev, { id, left, duration, created: Date.now() }])
        
        // Cleanup old shards
        setTimeout(() => {
          setShards(prev => prev.filter(s => s.id !== id))
        }, duration * 1000)
      }, SHARD_SPAWN_RATE)
    }
  }

  // 4. SHARD INTERACTION (Tap to Reveal)
  const handleShardClick = (e, shardId) => {
    e.stopPropagation()
    // Haptic
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }

    // Spawn Popup Text
    const task = TASKS[Math.floor(Math.random() * TASKS.length)]
    const x = e.clientX
    const y = e.clientY
    const popId = Math.random()

    setPopups(prev => [...prev, { id: popId, text: task, x, y }])
    
    // Remove Shard visually immediately
    setShards(prev => prev.filter(s => s.id !== shardId))

    // Remove Popup after 1s
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== popId))
    }, 1000)
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white font-mono overflow-hidden relative select-none">
      
      {/* CSS STYLES FOR ANIMATION */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.8; border-width: 1px; }
          100% { transform: scale(3); opacity: 0; border-width: 0px; }
        }
        @keyframes floatUp {
          0% { bottom: -20px; opacity: 0; transform: scale(0.5); }
          20% { opacity: 1; }
          100% { bottom: 60%; opacity: 0; transform: scale(1.2); }
        }
        .shard-glow {
          box-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4;
        }
      `}</style>

      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] opacity-10 pointer-events-none">
        {[...Array(400)].map((_, i) => <div key={i} className="border-[0.5px] border-gray-800"></div>)}
      </div>

      {/* HEADER */}
      <div className="w-full p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black to-transparent">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">RIM</h1>
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${status === 'MINING' ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-gray-500'}`}></div>
            <span className="text-[10px] tracking-widest text-gray-400">{status === 'MINING' ? 'PROCESSING NODE' : 'STANDBY'}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Balance</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{balance.toFixed(2)}</p>
        </div>
      </div>

      {/* CORE: THE BAT NEURAL HEART */}
      <div className="flex-1 w-full flex items-center justify-center relative z-10">
        
        {/* SHARDS LAYER (Floating Up) */}
        {shards.map(shard => (
          <div
            key={shard.id}
            onClick={(e) => handleShardClick(e, shard.id)}
            className="absolute w-6 h-6 bg-cyan-900/40 border border-cyan-400 rounded-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              left: `${shard.left}%`,
              animation: `floatUp ${shard.duration}s linear forwards`
            }}
          >
            <div className="w-2 h-2 bg-cyan-400 rounded-full shard-glow"></div>
          </div>
        ))}

        {/* POPUP TEXT LAYER */}
        {popups.map(pop => (
          <div 
            key={pop.id}
            className="absolute text-[10px] text-cyan-300 font-bold tracking-wider pointer-events-none z-50 whitespace-nowrap"
            style={{ left: pop.x, top: pop.y - 40, textShadow: '0 0 10px #000' }}
          >
            {pop.text}
          </div>
        ))}

        {/* THE CORE BUTTON */}
        <div 
          onClick={toggleMining}
          className="relative w-48 h-48 flex items-center justify-center cursor-pointer group"
        >
          {/* Pulse 3: Distant Ring */}
          {status === 'MINING' && (
            <div className="absolute inset-0 border border-cyan-900 rounded-full animate-[ripple_3s_infinite_linear]"></div>
          )}
          
          {/* Pulse 2: Thinking Wave */}
          {status === 'MINING' && (
            <div className="absolute inset-4 border border-cyan-700 rounded-full animate-[ripple_2s_infinite_linear_0.5s]"></div>
          )}

          {/* Pulse 1: Fast Ripple */}
          {status === 'MINING' && (
            <div className="absolute inset-10 border border-cyan-500/50 rounded-full animate-[ripple_1s_infinite_linear]"></div>
          )}

          {/* THE BAT-CORE (SVG Silhouette) */}
          <div className={`relative z-20 transition-all duration-500 ${status === 'MINING' ? 'scale-110 drop-shadow-[0_0_30px_#06b6d4]' : 'scale-100 opacity-50 grayscale'}`}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill={status === 'MINING' ? '#fff' : '#444'} xmlns="http://www.w3.org/2000/svg">
               {/* Abstract "Bat/Chip" Shape */}
               <path d="M12 2L2 7L12 12L22 7L12 2Z" fillOpacity="0.5"/>
               <path d="M2 17L12 12L22 17L12 22L2 17Z" fillOpacity="0.5"/>
               <path d="M2 7L2 17L12 12L12 2L2 7Z" fillOpacity="0.8"/>
               <path d="M22 7L22 17L12 12L12 2L22 7Z" fillOpacity="0.8"/>
            </svg>
            {/* Status Text under core */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className={`text-[10px] tracking-[0.3em] font-bold ${status === 'MINING' ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`}>
                {status === 'MINING' ? 'UPLINK ACTIVE' : 'TAP TO START'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER STATS */}
      <div className="w-full p-6 z-20 bg-black/80 border-t border-gray-900">
        <div className="flex justify-between text-[10px] text-gray-500 tracking-widest uppercase">
          <span>Hash Rate: {status === 'MINING' ? '450 H/s' : '0 H/s'}</span>
          <span>NPU: {status === 'MINING' ? 'OPTIMIZED' : 'SLEEP'}</span>
        </div>
      </div>

    </div>
  )
}

export default App