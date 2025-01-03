import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { getServerUrl } from '../../utils/utils'
import { MD5 } from 'crypto-js'
import toast from 'react-hot-toast'

export function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [activationToken, setActivationToken] = useState('')
  const [isVerificationStep, setIsVerificationStep] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const serverUrl = getServerUrl();

    if (isVerificationStep) {
      // Handle verification code submission
      setIsSubmitting(true)
      try {
        const response = await fetch(serverUrl + '/verify/activation',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: activationToken, verificationcode: verificationCode }),
          });

        if (!response.ok) throw new Error();
        const data = await response.json();

        switch (data.status) {

          case 0:
            toast.success('Account created successfully')
            navigate('/signin')
            break;
          case -100:
            toast.error('Submit too often. Please try again later.');
            break;
          case -104:
            toast.error('The code is wrong! Please try again.');
            break;
          case -106:
            toast.error('The code is expired! Please check your email for the latest code.');
            setActivationToken(data.token);
            break;
          default:
            toast.error('Unknown error. Please try again.');
            break;
        }
      }
      catch (error) {
        toast.error('Could not connect to server. Please try again.');
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // Regular expression for email validation

    if (!email || !emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Handle initial form submission
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setIsSubmitting(true)
    // use crypto to hash password
    const hashedPassword = MD5(password).toString();

    try {
      const response = await fetch(serverUrl + '/api/v2/signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            email: email,
            password: hashedPassword,
          })
        });

      if (!response.ok) throw new Error();
      const data = await response.json();

      switch (data.status) {
        case 0:
          setActivationToken(data.token)
          toast.success('Verification code sent to your email')
          setIsVerificationStep(true)
          break;
        case -100:
          toast.error('Submit too often. Please try again later.');
          break;
        case -101:
        case -102:
          toast.error('Invalid email or password. Please try again.');
          break;
        case -103:
          toast.error('Email already exists. Please try again.');
          break;
        default:
          toast.error('Could not connect to server. Please try again.');
          break;
      }
    } catch (error) {
      toast.error('Could not connect to server. Please try again.');
      //console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isVerificationStep ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your password will be securely hashed on your device before being sent to our servers.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setIsVerificationStep(false)}
            className="mb-4 flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Verification Code</label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Enter the 6-digit code sent to <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{email}</span>
          </p>
          <input
            type="text"
            required
            maxLength={6}
            pattern="\d{6}"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center tracking-widest"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
          <button
            type="button"
            onClick={() => {
              toast.success('New verification code sent')
              setVerificationCode('')
            }}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Resend code
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isVerificationStep ? 'Verify Code' : 'Sign Up'}
      </button>

      <div className="text-sm text-center">
        <Link to="/signin" className="text-blue-600 dark:text-blue-400 hover:underline">
          Already have an account? Sign In
        </Link>
      </div>
    </form>
  )
}
