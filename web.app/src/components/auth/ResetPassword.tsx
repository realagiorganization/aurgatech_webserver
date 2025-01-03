import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { MD5 } from 'crypto-js'
import toast from 'react-hot-toast'
import { getServerUrl } from '../../utils/utils'

export function ResetPassword() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const navigate = useNavigate()

  const handleSendCode = async () => {
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // Regular expression for email validation
    if (!email || !emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return;
    }

    setIsSubmitting(true)

    const serverUrl = getServerUrl();

    const emailHash = MD5(email.trim().toLowerCase()).toString();
    try {
      const response = await fetch(serverUrl + '/api/v2/reset_password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailHash }),
        });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      if (data.status === 0) {
        setResetToken(data.token);
        toast.success('Verification code sent to your email')
        setCodeSent(true)
      } else if (data.status === -100) {
        toast.error('Request too often! Please try again later.');
      } else if (data.status === -104) {
        setResetToken('');
        toast.error('Invalid email. Please try again later.');
      } else {
        toast.error('Unknown error. Please try again.');
      }
    } catch (error) {
      //console.error(error);
      toast.error('Could not connect to server. Please try again.');
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // Regular expression for email validation
    if (!email || !emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return;
    }

    if (!verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm your new password')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setIsSubmitting(true)

    try {
      const serverUrl = getServerUrl();
      const passwordHash = MD5(newPassword).toString();
      const response = await fetch(serverUrl + '/api/v2/verify_resetpassword_code',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, verificationcode: verificationCode, newpassword: passwordHash }),
        }
      );

      if (!response.ok)
        throw new Error();

      const data = await response.json();

      if (data.status === 0) {
        toast.success('Password reset successfully')
        navigate('/signin');
      } else if (data.status === -100) {
        toast.error('Request too often! Please try again later.');
      } else if (data.status === -104) {
        toast.error('The code is wrong! Please try again.');
      } else if (data.status === -106) {
        setResetToken(data.token);
        toast.error('The code is expired! Please check your email for the latest code.');
      } else {
        toast.error('Unknown error. Please try again.');
      }
    } catch (error) {
      //console.error(error);
      toast.error('Could not connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
        <div className="mt-1 flex space-x-2">
          <input
            type="email"
            required
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={codeSent}
          />
          <button
            type="button"
            onClick={handleSendCode}
            disabled={isSubmitting || !email || codeSent}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : codeSent ? (
              'Code Sent'
            ) : (
              'Send Code'
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Verification Code</label>
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
        {codeSent && (
          <button
            type="button"
            onClick={handleSendCode}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Resend code
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-200">
          New Password
        </label>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            id="newPassword"
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {showNewPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
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

      <button
        type="submit"
        disabled={isSubmitting || !codeSent}
        className="w-full flex items-center justify-center bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Reset Password
      </button>

      <div className="text-sm text-center">
        <Link to="/signin" className="text-blue-600 dark:text-blue-400 hover:underline">Back to Sign In</Link>
      </div>
    </form>
  )
}
