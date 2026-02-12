import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
  const [status, setStatus] = useState('IDLE')
  const [user, setUser] = useState(null)

  // Load User Data on Start
  useEffect(() => {
    // 1. Check if running inside Telegram
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      
      // If we have a real Telegram user, use them
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user)
      } else {
        // Fallback for browser testing (Mock User)
        setUser({
          id: 999999999,
          first_name: 'Guest',
          username: 'browser_test',
          is_premium: false
        })
      }
    }
  }, [])

  const handleInitialize = async () => {
    if (!user) return
    setStatus('SYNCING...')
    
    // 2. Prepare the Payload
    const nodeData = {
      id: user.id, // REAL Telegram ID
      first_name: user.first_name,
      username: user.username,
      is_premium: user.is_premium || false,
      balance: 1000 // Genesis Bonus
    }

    // 3. Send to RIM Database
    const { error } = await supabase
      .from('users')
      .upsert(nodeData)

    if (error) {
      console.error('Uplink Failed:', error)
      setStatus('ERROR')
    } else {
      setStatus('UPLINK ACTIVE')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black text-white font-mono">
      <div className="mb-12 text-center">
        <h1 className="text-7xl font-black tracking-[0.3em] text-white">RIM</h1>
        <p className="text-[10px] text-gray-600 tracking-[0.5em] uppercase mt-2">Intelligence Protocol</p>
      </div>

      <div className="w-full max-w-xs bg-gray-900 border border-gray-800 p-4 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-gray-500">OPERATOR:</span>
          <span className="text-[10px] text-blue-400 uppercase">
            {user ? user.first_name : 'UNKNOWN'}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-gray-500">NODE_STATUS:</span>
          <span className={`text-[10px] ${status === 'UPLINK ACTIVE' ? 'text-green-500' : 'text-yellow-500'}`}>
            {status === 'IDLE' ? 'STANDBY' : status}
          </span>
        </div>
        <div className="h-1 w-full bg-gray-800 overflow-hidden">
          {status === 'SYNCING...' && <div className="h-full bg-white animate-pulse"></div>}
          {status === 'UPLINK ACTIVE' && <div className="h-full bg-green-500"></div>}
        </div>
      </div>
      
      <button 
        onClick={handleInitialize}
        disabled={status === 'UPLINK ACTIVE'}
        className="w-full max-w-xs py-4 border border-white text-white font-bold hover:bg-white hover:text-black transition-all tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'UPLINK ACTIVE' ? 'CONNECTION STABLE' : 'INITIALIZE UPLINK'}
      </button>

      <footer className="absolute bottom-8 opacity-20 text-[9px] tracking-widest">
        ESTABLISHING EDGE DOMINANCE • $RIM
      </footer>
    </div>
  )
}

export default App