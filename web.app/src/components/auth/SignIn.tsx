import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { MD5 } from 'crypto-js'
import { config } from '../../utils/config'
import { getServerUrl, isValidEmail } from '../../utils/utils'

const PUBLIC_CLOUD_URL = 'https://my.aurga.com'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || PUBLIC_CLOUD_URL)
  const [serverType, setServerType] = useState<'public' | 'private'>(
    localStorage.getItem('serverType') as 'public' | 'private' || 'public'
  )
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const serverUrl = getServerUrl();

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return;
    }

    try {
      const emailHash = MD5(email.trim().toLowerCase()).toString();
      const passwordHash = MD5(password).toString();

      let url = serverUrl + '/api/v2/signin';
      const response = await fetch(url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailHash,
            password: passwordHash,
          })
        });

      if (!response.ok)
        throw new Error('');

      const data = await response.json();

      if (data.status !== 0) {
        if (data.status === -100)
          toast.error('Login too fast. Please try again.');
        else if (data.status === -107)
          toast.error('Your account is not activated. Please reset your password to verify and activate your account.');
        else {
          localStorage.removeItem('user');
          config.BOUND_DEVICES = [];
          toast.error('Invalid email or password. Please try again.');
        }
        return;
      }

      const name = data.name?.length > 0 ? data.name : email.split('@')[0];

      // Create user data
      const userData = {
        id: '0',
        email: email,
        name: name,
        createdAt: new Date().toISOString(),
        loginAt: new Date(),
        uid: data.uid,
        token: data.token,
        type: 'main' as const,
        status: 'active' as const
      }

      // Store user data
      localStorage.setItem('user', JSON.stringify(userData))

      toast.success('Signed in successfully')
      navigate('/devices')
      //  else {
      //   navigate('/devices')
      // }
    } catch (error) {
      toast.error('Failed to sign in. Please try again.')
    } finally {

    }
  }

  return (
    <div className="space-y-4">
     
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Password
          </label>
          <div className="relative">
            {/*  focus:outline-none focus:ring-2 focus:ring-blue-500 */}
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700"
        >
          Sign In
        </button>
      </form>
      <div className="text-sm text-center space-x-4">
        <Link to="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">Sign Up</Link>
        <Link to="/reset-password" className="text-blue-600 dark:text-blue-400 hover:underline">Reset Password</Link>
      </div>
    </div>
  )
}
