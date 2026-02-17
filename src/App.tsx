import { toast, Toaster } from './components/toast'
import appIcon from './img/app-icon.svg'

function App() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-4 p-8">
      <Toaster position="top-center" />

      <h1 className="text-2xl font-bold text-slate-800 mb-4">
        AI Notification System
      </h1>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => {
            toast({
              title: 'Reminders',
              description: 'Buy groceries for the weekend',
              icon: appIcon,
            })
          }}
          className="px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow-md active:scale-[0.97] transition-[shadow,transform] text-sm font-medium text-slate-700 cursor-pointer"
        >
          Add notification
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        Click stack to expand &middot; Click outside to collapse &middot; Swipe to dismiss
      </p>
    </div>
  )
}

export default App
