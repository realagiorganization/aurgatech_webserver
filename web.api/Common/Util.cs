using Org.BouncyCastle.Crypto.Engines;
using Org.BouncyCastle.Crypto.Modes;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto;
using System.Security.Cryptography;
using static System.Runtime.InteropServices.JavaScript.JSType;
using aurga.Data;
using aurga.Model;
using Microsoft.EntityFrameworkCore;

namespace aurga.Common
{
    public static class Util
    {
        public static readonly byte[] Fixed_Heartbeart_Key = { 0x1A, 0x2B, 0x3C, 0x4D, 0x5E, 0x6F, 0x7A, 0x8B, 0x9C, 0xAD, 0xBE, 0xCF, 0xD0, 0xE1, 0xF2, 0x03 };

        /// <summary>
        /// Convert hex string into byte array
        /// </summary>
        /// <param name="hexstr"></param>
        /// <returns></returns>
        public static byte[] Hex2Bytes(string hexstr)
        {
            if (string.IsNullOrEmpty(hexstr) || hexstr.Length % 2 != 0)
            {
                return null;
            }

            try
            {
                return Enumerable.Range(0, hexstr.Length)
                         .Where(x => x % 2 == 0)
                         .Select(x => Convert.ToByte(hexstr.Substring(x, 2), 16))
                         .ToArray();
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public static string Bytes2Hex(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0)
            {
                return string.Empty;
            }

            return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }

        public static void PoisonSalt(byte[] salt, int[][] swaps, int invert, int zero)
        {
            byte tmp;
            for (int i = 0; i < swaps.Length; i++)
            {
                tmp = salt[swaps[i][0]];
                salt[swaps[i][0]] = salt[swaps[i][1]];
                salt[swaps[i][1]] = tmp;
            }

            if (invert > -1)
            {
                tmp = (byte)(~salt[invert] & 0xFF);
                salt[invert] = tmp;
            }

            if (zero > -1)
            {
                salt[zero] = 0;
            }
        }

        public static void Encrypt(byte[] input, byte[] key)
        {
            if (input == null || input.Length == 0) return;
            byte[] iv = { 0xA2, 0xB4, 0x00, 0xAE, 0xA3, 0x91, 0xE6, 0x40, 0x03, 0xF0, 0xD4, 0xEE, 0xA2, 0x9D, 0x76, 0x5B };
            // Create AES engine
            var engine = new AesEngine();

            // Create CTR cipher (no padding)
            var cipher = new BufferedBlockCipher(new SicBlockCipher(engine));

            // Initialize cipher with key and IV
            cipher.Init(true, new ParametersWithIV(new KeyParameter(key), iv));

            // Encrypt data
            byte[] output = new byte[cipher.GetOutputSize(input.Length)];
            int length1 = cipher.ProcessBytes(input, 0, input.Length, output, 0);
            cipher.DoFinal(output, length1);

            for (int i = 0; i < output.Length; i++)
            {
                input[i] = output[i];
            }
        }

        public static void GetDataByLocalKey(byte[] data, byte[] key)
        {
            int[][] swaps = { new[] { 3, 11 }, new[] { 4, 1 } };
            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, 6, 5);
            Encrypt(data, tmpKey);
        }

        public static void GetDataByKey1(byte[] data, byte[] key)
        {
            int[][] swaps = { new[] { 4, 0 }, new[] { 7, 9 } };
            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, 11, -1);
            Encrypt(data, tmpKey);
        }

        public static void GetDataByKey2(byte[] data, byte[] key)
        {
            int[][] swaps = { new[] { 4, 0 }, new[] { 7, 9 } };
            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, 6, -1);
            Encrypt(data, tmpKey);
        }

        public static void GetDataByKey3(byte[] data, byte[] key)
        {
            int[][] swaps = { new[] { 7, 10 }, new[] { 2, 5 } };
            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, 3, -1);
            Encrypt(data, tmpKey);
        }

        public static void GetDataByKey4(byte[] data, byte[] key)
        {
            int[][] swaps = { new[] { 2, 11 }, new[] { 6, 5 } };
            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, 9, -1);
            Encrypt(data, tmpKey);
        }

        public static byte[] GenerateRandomBytes(int numberOfBytes)
        {
            byte[] randomBytes = new byte[numberOfBytes];
            using (RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(randomBytes);
            }
            return randomBytes;
        }
        public static string GenerateUserToken(string token)
        {
            var key = GenerateRandomBytes(16);
            var token_data = Hex2Bytes(token);

            int[][] swaps = { new[] { 0, 0 }, new[] { 0, 0 } };

            swaps[0][0] = key[5] % 15;
            swaps[0][1] = key[1] % 15;
            swaps[1][0] = key[10] % 15;
            swaps[1][1] = key[3] % 15;
            int revert = key[7] % 15;
            int zero = key[14] % 15;

            if (swaps[0][0] == swaps[0][1])
            {
                if (swaps[0][0] > 8)
                {
                    swaps[0][1] = swaps[0][0] - 1;
                }
                else
                {
                    swaps[0][1] = swaps[0][0] + 1;
                }
            }

            if (swaps[1][0] == swaps[1][1])
            {
                if (swaps[1][0] > 8)
                {
                    swaps[1][1] = swaps[1][0] - 1;
                }
                else
                {
                    swaps[1][1] = swaps[1][0] + 1;
                }
            }

            if (revert == zero)
            {
                if (revert > 8)
                {
                    zero = revert - 1;
                }
                else
                {
                    zero = revert + 1;
                }
            }

            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, revert, zero);

            Encrypt(token_data, tmpKey);

            return Bytes2Hex(key) + Bytes2Hex(token_data);
        }

        public static string DecodeUserToken(string userToken)
        {
            var data = Hex2Bytes(userToken);
            var key = data.Take(16).ToArray();
            var token_data = data.Skip(16).ToArray();

            int[][] swaps = { new[] { 0, 0 }, new[] { 0, 0 } };

            swaps[0][0] = key[5] % 15;
            swaps[0][1] = key[1] % 15;
            swaps[1][0] = key[10] % 15;
            swaps[1][1] = key[3] % 15;
            int revert = key[7] % 15;
            int zero = key[14] % 15;

            if (swaps[0][0] == swaps[0][1])
            {
                if (swaps[0][0] > 8)
                {
                    swaps[0][1] = swaps[0][0] - 1;
                }
                else
                {
                    swaps[0][1] = swaps[0][0] + 1;
                }
            }

            if (swaps[1][0] == swaps[1][1])
            {
                if (swaps[1][0] > 8)
                {
                    swaps[1][1] = swaps[1][0] - 1;
                }
                else
                {
                    swaps[1][1] = swaps[1][0] + 1;
                }
            }

            if (revert == zero)
            {
                if (revert > 8)
                {
                    zero = revert - 1;
                }
                else
                {
                    zero = revert + 1;
                }
            }

            byte[] tmpKey = new byte[key.Length];
            Array.Copy(key, tmpKey, key.Length);

            PoisonSalt(tmpKey, swaps, revert, zero);

            Encrypt(token_data, tmpKey);

            return Bytes2Hex(token_data);
        }

        static string Encode(string hexString, int bit, int flip)
        {
            var binStr = "";
            var output = "";

            for (var i = 0; i < hexString.Length; i += 2)
            {
                var hex = hexString.Substring(i, 2);
                var bin = Convert.ToString(Convert.ToInt32(hex, 16), 2).PadLeft(8, '0');
                binStr += bin;
            }

            binStr = binStr.Substring(bit, binStr.Length - bit) + binStr.Substring(0, bit);

            for (var i = 0; i < binStr.Length; i += 8)
            {
                var byteStr = binStr.Substring(i, 8);
                var @byte = Convert.ToByte(byteStr, 2);

                var mask = 1 << flip; // Create a mask with the flip bit set
                @byte ^= (byte)mask; // Invert the bit

                mask = 1 << bit;
                @byte ^= (byte)mask; // Invert the bit

                output += @byte.ToString("x2");
            }

            return output;
        }

        static string Decode(string hexString, int bit, int flip)
        {
            var binStr = "";
            var output = "";

            for (var i = 0; i < hexString.Length; i += 2)
            {
                var hex = hexString.Substring(i, 2);
                var bin = Convert.ToString(Convert.ToInt32(hex, 16), 2).PadLeft(8, '0');
                binStr += bin;
            }

            for (var i = 0; i < binStr.Length; i += 8)
            {
                var byteStr = binStr.Substring(i, 8);
                var @byte = Convert.ToByte(byteStr, 2);

                var mask = 1 << flip; // Create a mask with the flip bit set
                @byte ^= (byte)mask; // Invert the bit

                mask = 1 << bit;
                @byte ^= (byte)mask; // Invert the bit

                output += @byte.ToString("x2");
            }

            binStr = "";
            for (var i = 0; i < output.Length; i += 2)
            {
                var hex = output.Substring(i, 2);
                var bin = Convert.ToString(Convert.ToInt32(hex, 16), 2).PadLeft(8, '0');
                binStr += bin;
            }

            binStr = binStr.Substring(binStr.Length - bit, bit) + binStr.Substring(0, binStr.Length - bit);

            output = "";
            for (var i = 0; i < binStr.Length; i += 8)
            {
                var byteStr = binStr.Substring(i, 8);
                var hex = Convert.ToInt32(byteStr, 2).ToString("x2");
                output += hex;
            }

            return output;
        }

        static Dictionary<string, DateTime> ipLimits = new Dictionary<string, DateTime>();

        public static bool AllowAccess(string ipAddress, int ts = 500)
        {
            if (ts == 0) return true;
            //if (ipAddress == "mirror1.yourdomain.ip" ||
            //    ipAddress == "mirror2.yourdomain.ip" ||
            //    ipAddress == "mirror3.yourdomain.ip")
            //{
            //    Console.WriteLine($"Skip {ipAddress}");
            //    return true;
            //}
            if (ipAddress == "83.229.122.237" ||
                ipAddress == "20.114.1.110" ||
                ipAddress == "2001:df1:7880:2::e5a")
            { 
                return true; 
            }

            // Define the time limit between registrations from the same IP
            TimeSpan limit = TimeSpan.FromMilliseconds(ts);
            lock (ipLimits)
            {
                if (ipLimits.ContainsKey(ipAddress))
                {
                    var now = DateTime.Now;
                    var internval = now - ipLimits[ipAddress];
                    if (internval.TotalSeconds < limit.TotalSeconds)
                    {
                        // If the last registration from this IP was less than the limit ago, deny registration
                        return false;
                    }
                    else
                    {
                        // If the last registration from this IP was longer than the limit ago, update the last registration time and allow registration
                        ipLimits[ipAddress] = DateTime.Now;
                        return true;
                    }
                }
                else
                {
                    // If this IP has not registered before, add it to the dictionary and allow registration
                    ipLimits.Add(ipAddress, DateTime.Now);
                    return true;
                }
            }
        }

        public static void GenerateNewActivationCodeIfNecessary(UserInfo userInfo)
        {
            if (DateTime.Now.Subtract(userInfo.ActivationVerificationTime).TotalMinutes > 3 ||
                string.IsNullOrEmpty(userInfo.ActivationToken) ||
                string.IsNullOrEmpty(userInfo.ActivationVerificationCode))
            {
                userInfo.ActivationVerificationCode = (Random.Shared.Next() % 1000000).ToString("000000");
                userInfo.ActivationToken = Util.Bytes2Hex(Util.GenerateRandomBytes(8));
                userInfo.ActivationVerificationTime = DateTime.Now;

                EmailHelper.SendActivationEmail(userInfo.Email, userInfo.ActivationVerificationCode);
            }
        }

        public static void GenerateNewResetPasswordCodeIfNecessary(UserInfo userInfo)
        {
            if (DateTime.Now.Subtract(userInfo.ResetPasswordVerificationTime).TotalMinutes > 3 ||
                string.IsNullOrEmpty(userInfo.ResetPasswordToken) ||
                string.IsNullOrEmpty(userInfo.ResetPasswordVerificationCode))
            {
                userInfo.ResetPasswordVerificationCode = (Random.Shared.Next() % 1000000).ToString("000000");
                userInfo.ResetPasswordToken = Util.Bytes2Hex(Util.GenerateRandomBytes(8));
                userInfo.ResetPasswordVerificationTime = DateTime.Now;

                EmailHelper.SendResetPasswordEmail(userInfo.Email, userInfo.ResetPasswordVerificationCode);
            }
        }

        public static void GenerateUpdateEmailCodeIfNecessary(UserInfo userInfo, string newEmail)
        {
            if (DateTime.Now.Subtract(userInfo.UpdateEmailVerificationTime).TotalMinutes > 3 ||
                string.IsNullOrEmpty(userInfo.UpdateEmailToken) ||
                string.IsNullOrEmpty(userInfo.UpdateEmailVerificationCode) ||
                !string.Equals(newEmail, userInfo.NewEmail, StringComparison.InvariantCultureIgnoreCase))
            {
                userInfo.UpdateEmailVerificationCode = (Random.Shared.Next() % 1000000).ToString("000000");
                userInfo.UpdateEmailToken = Util.Bytes2Hex(Util.GenerateRandomBytes(8));
                userInfo.UpdateEmailVerificationTime = DateTime.Now;
                userInfo.NewEmail = newEmail;

                EmailHelper.SendUpdateEmailEmail(newEmail, userInfo.UpdateEmailVerificationCode);
            }
        }

        public static void GenerateDeactivationCodeIfNecessary(UserInfo userInfo)
        {
            if (DateTime.Now.Subtract(userInfo.DeactivationVerificationTime).TotalMinutes > 3 ||
                string.IsNullOrEmpty(userInfo.DeactivationToken) ||
                string.IsNullOrEmpty(userInfo.DeactivationVerificationCode))
            {
                userInfo.DeactivationVerificationCode = (Random.Shared.Next() % 1000000).ToString("000000");
                userInfo.DeactivationToken = Util.Bytes2Hex(Util.GenerateRandomBytes(8));
                userInfo.DeactivationVerificationTime = DateTime.Now;

                EmailHelper.SendDeactivationCodeEmail(userInfo.Email, userInfo.DeactivationVerificationCode);
            }
        }

       public static async Task<UserInfo> LoadUserInfoAsync(HttpContext http, User user)
        {
            // check if user exists in cache
            UserInfo? userInfo;
            bool newUser = false;
            DeviceStatus ds = null;

            lock (SharedStore.Users)
            {
                userInfo = SharedStore.Users.FirstOrDefault(u => u.UserGUID == user.UserGUID);
                if (userInfo == null)
                {
                    // User is not in cache, create new user info
                    userInfo = new UserInfo
                    {
                        Id = user.UserId,
                        Name = user.Name,
                        EmailHash = user.EmailHash,
                        PasswordHash = user.PasswordHash,
                        Email = user.Email,
                        UserGUID = user.UserGUID,
                        Activated = user.Activated,
                        Token = Util.Bytes2Hex(Util.GenerateRandomBytes(16)),
                    };

                    // Add user to cache
                    SharedStore.Users.Add(userInfo);

                    newUser = true;
                }
            }

            var ctx = http.RequestServices.GetRequiredService<DataContext>();
            if (newUser)
            {
                var devices = await ctx.Devices.Where(d => d.UserGUID == user.UserGUID).ToListAsync();

                lock (SharedStore.AllDevices)
                {
                    // Add user's devices to cache
                    foreach (var device in devices)
                    {
                        ds = SharedStore.AllDevices.FirstOrDefault(o => o.DeviceId == device.DeviceId);

                        if (ds == null)
                        {
                            ds = new DeviceStatus
                            {
                                DeviceId = device.DeviceId,
                                DeviceGUID = device.DeviceGUID,
                                DeviceName = device.Name,
                                Model = (byte)device.Model,
                                LastActive = new DateTime(1970, 1, 1),
                            };

                            SharedStore.AllDevices.Add(ds);
                        }

                        var sharedAccounts = (from u in ctx.Users
                                              join sa in ctx.SubAccounts
                                              on u.UserId equals sa.AccountId
                                              join sd in ctx.SubDevices
                                              on sa.SubAccountId equals sd.SubAccountId
                                              where sd.DeviceId == device.DeviceId &&
                                              sa.Status == SubAccountStatus.Approved &&
                                              sd.Status == DeviceState.Normal
                                              select u.UserGUID).ToList();

                        lock (ds)
                        {
                            sharedAccounts.ForEach(o => ds.AddSharedAccount(o));
                            ds.SharedAccountUpdated = true;
                        }

                        lock (userInfo.Devices)
                        {
                            userInfo.Devices.Add(ds);
                        }
                        ds.Update();
                    }
                }

                var subdevices = from subDevice in ctx.SubDevices 
                                 join device in ctx.Devices 
                                 on subDevice.DeviceId equals device.DeviceId 
                                 join subacc in ctx.SubAccounts
                                 on subDevice.SubAccountId equals subacc.SubAccountId
                                 where subacc.AccountId == user.UserId &&
                                 subacc.Status == SubAccountStatus.Approved &&
                                 subDevice.Status == DeviceState.Normal select new { 
                    device.DeviceId, device.DeviceGUID, device.UserGUID, subDevice.Name, device.Model };

                lock (SharedStore.AllDevices)
                {
                    foreach (var dev in subdevices)
                    {
                        ds = SharedStore.AllDevices.FirstOrDefault(o => o.DeviceId == dev.DeviceId);

                        if (ds == null)
                        {
                            ds = new DeviceStatus
                            {
                                DeviceId = dev.DeviceId,
                                DeviceGUID = dev.DeviceGUID,
                                DeviceName = dev.Name,
                                Model = (byte)dev.Model,
                                LastActive = new DateTime(1970, 1, 1),
                            };

                            SharedStore.AllDevices.Add(ds);
                        }
                    }
                }
            }

            return userInfo;
        }
    }
}

