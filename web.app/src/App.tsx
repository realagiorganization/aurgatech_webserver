import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthLayout } from './components/auth/AuthLayout'
import { SignIn } from './components/auth/SignIn'
import { SignUp } from './components/auth/SignUp'
import { ResetPassword } from './components/auth/ResetPassword'
import { MainLayout } from './components/layout/MainLayout'
import { HelpCenter } from './components/pages/HelpCenter'
import { Devices } from './components/pages/Devices'
import { Settings } from './components/pages/Settings'
import { Account } from './components/pages/Account'
import { config } from './utils/config'
import './index.css'

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/" element={<AuthLayout />}>
            {!config.APP_INITED && !(localStorage.getItem('user') || localStorage.getItem('skipLogin') === 'true') &&
              <Route index element={<Navigate to="/signin" />} />
            }
            <Route path="signin" element={<SignIn />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          {/* Main routes */}
          <Route path="/" element={<MainLayout />}>
            {!config.APP_INITED && (localStorage.getItem('user') || localStorage.getItem('skipLogin') === 'true') &&
              <Route index element={<Navigate to="/devices" />} />
            }
            <Route path="devices" element={<Devices />} />
            <Route path="account" element={<Account />} />
            <Route path="help-center" element={<HelpCenter />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  )
}

export default App
