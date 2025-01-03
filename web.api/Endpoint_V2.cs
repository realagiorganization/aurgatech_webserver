using aurga.Common;
using aurga.Data;
using aurga.Model;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.Data;
using System.Text.Json;
using System.Xml.Linq;
using System.ComponentModel;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Collections.Concurrent;

namespace aurga
{
    public static class Endpoint_V2
    {
        public static void MapV2Endpoints(this WebApplication app)
        {
            var cacheUsers = SharedStore.Users;
            var invitations = SharedStore.Invitations;
            var allDevices = SharedStore.AllDevices;
            var deviceIpBlackList = new ConcurrentDictionary<string, DateTime>();
            #region User Sign Up
            app.MapPost("/api/v2/signup", async (HttpContext http, ReuqestRegisterUser user) =>
            {
                try
                {
                    // 
                    var addr = http.Connection.RemoteIpAddress.ToString();
                    var email = user.Email?.ToLower().Trim();
                    if (!Util.AllowAccess(addr))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }

                    // Validate input
                    if (string.IsNullOrEmpty(user.Password) || string.IsNullOrEmpty(email))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }
                    if (user.Password.Length != 32)
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

                    if (user.name?.Length > 64)
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

                    // check if user.email is valid format

                    if (!Regex.IsMatch(email, @"^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[\w-]{2,10}$"))
                    {
                        return Results.Json(new { status = RC.INVALID_EMAIL_FORMAT });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(user), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/signup", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();
                    // Check if email already exists
                    var existingUser = await ctx.Users.FirstOrDefaultAsync(u => u.Email == email);
                    if (existingUser != null)
                    {
                        // Email already exists
                        return Results.Json(new { status = RC.EMAIL_REGISTERED });
                    }

                    // Hash the email with MD5
                    var emailHash = Util.Bytes2Hex(MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(email)));
                    // Add new user
                    var newUser = new User
                    {
                        UserGUID = Util.Bytes2Hex(Util.GenerateRandomBytes(16)),
                        Name = user.name,
                        Email = email,
                        Activated = false,
                        EmailHash = emailHash,
                        PasswordHash = user.Password.ToLower(),
                        CreatedAt = DateTime.UtcNow,
                        VisitedAt = DateTime.UtcNow,
                    };
                    ctx.Users.Add(newUser);
                    await ctx.SaveChangesAsync();

                    UserInfo userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = new UserInfo
                        {
                            Id = newUser.UserId,
                            Name = newUser.Name,
                            EmailHash = newUser.EmailHash,
                            PasswordHash = newUser.PasswordHash,
                            Email = newUser.Email,
                            UserGUID = newUser.UserGUID,
                            Activated = newUser.Activated,
                            Token = Util.Bytes2Hex(Util.GenerateRandomBytes(16)),
                        };

                        // Add user to cache
                        cacheUsers.Add(userInfo);

#if TEST_MODE
                        // generate some devices for testing
                        var count = Random.Shared.Next(5, 20);
                        for (int i = 0; i < count; i++)
                        {
                            var device = new Device
                            {
                                UserGUID = newUser.UserGUID,
                                DeviceGUID = Util.Bytes2Hex(Util.GenerateRandomBytes(8)),
                                Status = DeviceState.Normal,
                                Model = 1,
                                Name = $"Test {newUser.UserId}#{i}",
                                RegisteredAt = DateTime.UtcNow
                            };
                            ctx.Devices.Add(device);
                        }
#endif
                    }


#if TEST_MODE
                    await ctx.SaveChangesAsync();
                    var devices = ctx.Devices.Where(o => o.UserGUID == userInfo.UserGUID);
                    lock (userInfo.Devices)
                    {
                        foreach (var device in devices)
                        {
                            var ds = new DeviceStatus
                            {
                                DeviceId = device.DeviceId,
                                DeviceGUID = device.DeviceGUID,
                                DeviceName = device.Name,
                                Model = (byte)device.Model,
                                LastActive = DateTime.Now
                            };
                            userInfo.Devices.Add(ds);
                            allDevices.Add(ds);
                        }
                    }
#endif

                    Util.GenerateNewActivationCodeIfNecessary(userInfo);

                    return Results.Json(new { status = RC.SUCCESS, token = userInfo.ActivationToken });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }

            });
            #endregion

            #region User Sign In
            app.MapPost("/api/v2/signin", async (HttpContext http, LoginRequest request) =>
            {
                try
                {
                    var email = request.Email.Trim().ToLower();
                    var password = request.Password.Trim().ToLower();
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString()))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
                    // Validate input
                    if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/signin", content);
                    var responseString = await response.Content.ReadAsStringAsync();
                    //var responseObject = JsonSerializer.Deserialize(responseString)

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    UserInfo userInfo = null;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(o => o.EmailHash == email && o.PasswordHash == password);
                    }

                    if (userInfo == null)
                    {
                        var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.EmailHash == email && u.PasswordHash == password);
                        if (user == null)
                        {
                            // Invalid user
                            return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                        }

                        userInfo = await Util.LoadUserInfoAsync(http, user);
                    }

                    if (!userInfo.Activated)
                    {
                        Util.GenerateNewActivationCodeIfNecessary(userInfo);

                        return Results.Json(new { status = RC.ACCOUNT_NOT_ACTIVATED, token = userInfo.ActivationToken });
                    }

                    if (DateTime.UtcNow.Subtract(userInfo.LastAccess).TotalDays >= 3)
                    {
                        // Refresh token
                        userInfo.LastToken = userInfo.Token;
                        userInfo.Token = Util.Bytes2Hex(Util.GenerateRandomBytes(16));
                    }

                    userInfo.LastAccess = DateTime.UtcNow;
                    var userToken = Util.GenerateUserToken(userInfo.Token);
                    var responseData = new { status = 0, uid = userInfo.UserGUID, token = userToken, name = userInfo.Name, v = 2 };
                    return Results.Json(responseData);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }

            });
            #endregion

            #region Login with token
            app.MapPost("/api/v2/loginWithToken", async (HttpContext http, RequestLoginWithToken request) =>
            {
                try
                {
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/loginWithToken", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    if (DateTime.UtcNow.Subtract(userInfo.LastAccess).TotalDays >= 7)
                    {
                        response_data = new { status = RC.TOKEN_EXPIRED };
                        return Results.Json(response_data);
                    }

                    if (DateTime.UtcNow.Subtract(userInfo.LastAccess).TotalDays >= 3)
                    {
                        userInfo.Token = Util.Bytes2Hex(Util.GenerateRandomBytes(16));
                    }

                    userInfo.LastAccess = DateTime.UtcNow;
                    var userToken = Util.GenerateUserToken(userInfo.Token);
                    var ctx = http.RequestServices.GetRequiredService<DataContext>();

                    var subdevices = (from acc in ctx.SubAccounts
                                      join subdev in ctx.SubDevices
                                      on acc.SubAccountId equals subdev.SubAccountId
                                      join dev in ctx.Devices
                                      on subdev.DeviceId equals dev.DeviceId
                                      where acc.AccountId == userInfo.Id
                                      && acc.Status == SubAccountStatus.Approved
                                      && subdev.Status == DeviceState.Normal select new
                                      {
                                          id = subdev.DeviceId,
                                          did = dev.DeviceGUID,
                                          name = subdev.Name,
                                          status = (int)DeviceState.Normal,
                                          model = dev.Model
                                      }).ToList();

                    var ids = subdevices.Select(o => o.id);

                    var subdevice_cache = allDevices.Where(o => ids.Contains(o.DeviceId));

                    if (request.IsWeb == true)
                    {
                        var list1 = from dev in userInfo.Devices
                                    select new
                                    {
                                        id = dev.DeviceId,
                                        name = dev.DeviceName,
                                        status = (int)DeviceState.Normal,
                                        lastSeen = dev.LastActive.ToUniversalTime(),
                                        flags = dev.Capability,
                                        build = dev.Firmware,
                                        version = dev.Version,
                                        model = dev.Model,
                                    };


                        var list2 = from dev in subdevices
                                    select new
                                    {
                                        dev.id,
                                        dev.name,
                                        dev.status,
                                        lastSeen = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.LastActive.ToUniversalTime(),
                                        flags = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.Capability,
                                        build = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.Firmware,
                                        version = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.Version,
                                        dev.model,
                                    };

                        var responseData = new { status = RC.SUCCESS, uid = userInfo.UserGUID, token = userToken, v = 4, devices = list1, subdevices = list2 };
                        return Results.Json(responseData);
                    }
                    else
                    {
                        byte[] devicePayload = null;
                        byte[] subdevicePayload = null;

                        //var list2 = from dev in subdevices
                        //            select new DeviceStatus
                        //            {
                        //                DeviceId = dev.id,
                        //                DeviceGUID = dev.did,
                        //                DeviceName = dev.name,
                        //                LastActive = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.LastActive.ToUniversalTime(),
                        //                flags = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.Capability,
                        //                build = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.Firmware,
                        //                version = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id)?.Version,
                        //                dev.model,
                        //            };

                        int payloadLength = 0;
                        int offset = 0;

                        lock (userInfo.Devices)
                        {
                            payloadLength = userInfo.Devices.Sum(d => d.Data.Length + 8);

                            if (payloadLength > 0)
                            {
                                devicePayload = new byte[4 + payloadLength];
                                offset = 4;
                                Array.Copy(BitConverter.GetBytes(userInfo.Devices.Count), devicePayload, 4);

                                foreach (var item in userInfo.Devices)
                                {
                                    BitConverter.GetBytes(item.DeviceId).CopyTo(devicePayload, offset);
                                    offset += 8; // userId
                                    Array.Copy(item.Data, 0, devicePayload, offset, item.Data.Length);
                                    offset += item.Data.Length;
                                }
                            }
                        }

                        if (subdevices.Count() > 0)
                        {
                            payloadLength = 0;
                            offset = 0;
                            foreach (var dev in subdevices)
                            {
                                var ds = new DeviceStatus { DeviceId = dev.id, DeviceGUID = dev.did, DeviceName = dev.name, Model = (byte)dev.model, LastActive = new DateTime(1970, 1, 1), Capability = 0, Firmware = 0, Version = 0 };
                                if (payloadLength == 0)
                                {
                                    payloadLength = subdevices.Count() * (ds.Data.Length + 8);
                                    subdevicePayload = new byte[4 + payloadLength];
                                    offset = 4;
                                    Array.Copy(BitConverter.GetBytes(subdevices.Count()), subdevicePayload, 4);
                                }

                                var cache = subdevice_cache.FirstOrDefault(o => o.DeviceId == dev.id);
                                if (cache != null)
                                {
                                    ds.LastActive = cache.LastActive;
                                    ds.Capability = cache.Capability;
                                    ds.Firmware = cache.Firmware;
                                    ds.LocalAddr = cache.LocalAddr;
                                    ds.LocalAddr6 = cache.LocalAddr6;
                                    ds.RemoteAddr = cache.RemoteAddr;
                                    ds.RemoteAddr6 = cache.RemoteAddr6;
                                    ds.RemoteAddrNatType = cache.RemoteAddrNatType;
                                    ds.RemoteAddr6NatType = cache.RemoteAddr6NatType;
                                    ds.Version = cache.Version;
                                }

                                ds.Update();
                                BitConverter.GetBytes(ds.DeviceId).CopyTo(subdevicePayload, offset);
                                offset += 8; // userId
                                Array.Copy(ds.Data, 0, subdevicePayload, offset, ds.Data.Length);
                                offset += ds.Data.Length;
                            }
                        }

                        var aid = Util.Hex2Bytes(userInfo.UserGUID);
                        if (devicePayload?.Length > 0) Util.GetDataByKey4(devicePayload, aid);
                        if (subdevicePayload?.Length > 0) Util.GetDataByKey4(subdevicePayload, aid);

                        var responseData = new { status = RC.SUCCESS, uid = userInfo.UserGUID, token = userToken, v = 3, devices = Util.Bytes2Hex(devicePayload), subdevices = Util.Bytes2Hex(subdevicePayload) };
                        return Results.Json(responseData);
                    }
                }
                catch (Exception e)
                {
                    Console.WriteLine(e);
                    return Results.Json(new { status = RC.EXCEPTION });
                }

            });
            #endregion

            #region Reset Password
            app.MapPost("/api/v2/reset_password", async (HttpContext http, RequestResetPassword request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 3000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/reset_password", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (request?.Email?.Length != 32)
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }


                    // Check if user exists
                    var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.EmailHash == request.Email.ToLower());
                    if (user == null)
                    {
                        // Invalid user
                        return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                    }

                    // check if user exists in cache
                    UserInfo? userInfo = await Util.LoadUserInfoAsync(http, user);
                    Util.GenerateNewResetPasswordCodeIfNecessary(userInfo);
                    return Results.Json(new { status = RC.SUCCESS, token = userInfo.ResetPasswordToken });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Verify Reset Password
            app.MapPost("/api/v2/verify_resetpassword_code", async (HttpContext http, RequestResetPasswordVerification request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 1000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.VerificationCode) || request?.NewPassword.Length != 32)
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/verify_resetpassword_code", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    //bool need_fill_devices = false;
                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => u.ResetPasswordVerificationCode == request.VerificationCode && u.ResetPasswordToken == request.Token);
                    }

                    if (userInfo == null)
                    {
                        return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                    }

                    var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.UserGUID == userInfo.UserGUID);
                    if (user == null)
                    {
                        // Invalid user
                        return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                    }

                    if (DateTime.Now.Subtract(userInfo.ResetPasswordVerificationTime).TotalMinutes > 10)
                    {
                        Util.GenerateNewResetPasswordCodeIfNecessary(userInfo);
                        return Results.Json(new { status = RC.TOKEN_EXPIRED, token = userInfo.ResetPasswordToken });
                    }

                    user.PasswordHash = request.NewPassword.ToLower();
                    user.Activated = true;
                    userInfo.Activated = true;
                    userInfo.ResetPasswordToken = string.Empty;
                    userInfo.ResetPasswordVerificationCode = string.Empty;
                    userInfo.ResetPasswordVerificationTime = new DateTime(0);
                    userInfo.PasswordHash = user.PasswordHash;
                    EmailHelper.SendResetPasswordSuccess(user.Email);
                    http.RequestServices.GetRequiredService<DataContext>().Users.Update(user);
                    await http.RequestServices.GetRequiredService<DataContext>().SaveChangesAsync();
                    return Results.Json(new { status = RC.SUCCESS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Device Heartbeat
            app.MapPost("/api/v2/device_heartbeat", async (HttpContext http, RequestHeartbeat request) =>
            {
                Dictionary<string, object> resp = new Dictionary<string, object>();
                // Validate input
                if ((request.v == 1 && request.Payload?.Length != 342) ||
                    (request.v == 2 && request.Payload?.Length != 48) ||
                    (request.v == 3 && request.Payload?.Length != 80))
                {
                    return Results.Json(new { status = RC.INVALID_PARAMETERS });
                }

                try
                {
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/device_heartbeat", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    UserInfo? userInfo, sharedAccount;
                    DeviceStatus? deviceStatus;

                    if (request.v == 1)
                    {
                        var addr = http.Connection.RemoteIpAddress.ToString();
                        var payload = Util.Hex2Bytes(request.Payload);

                        //var sb = new StringBuilder();
                        var version = payload[0];
                        var key = payload.Skip(1).Take(16).ToArray();

                        //sb.AppendLine("************************");
                        //sb.AppendLine($"Key: {Util.Bytes2Hex(key)}");
                        var data = payload.Skip(17).Take(payload.Length - 17).ToArray();
                        //sb.AppendLine($"Encrypted Data: {Util.Bytes2Hex(data)}");

                        // do md5 hash to key
                        MD5 md5Hasher = MD5.Create();
                        var hash = md5Hasher.ComputeHash(key);

                        //sb.AppendLine($"Hash: {Util.Bytes2Hex(hash)}");

                        int[][] swaps = { new[] { 0, 0 }, new[] { 0, 0 } };

                        swaps[0][0] = key[0] % 15;
                        swaps[0][1] = key[2] % 15;
                        swaps[1][0] = key[4] % 15;
                        swaps[1][1] = key[6] % 15;

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

                        int revert = key[9] % 15;
                        int zero = key[13] % 15;
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

                        //sb.AppendLine($"Swaps: {swaps[0][0]} - {swaps[0][1]} - {swaps[1][0]} - {swaps[1][1]} - {revert} - {zero}");

                        Util.PoisonSalt(hash, swaps, revert, zero);

                        //sb.AppendLine($"Poison Hash: {Util.Bytes2Hex(hash)}");
                        Util.Encrypt(data, hash);
                        //sb.AppendLine($"Decrypted Data: {Util.Bytes2Hex(data)}");

                        var aid = data.Take(16).ToArray();
                        var did = data.Skip(16).Take(8).ToArray();
                        var build = data.Skip(24).Take(8).ToArray();
                        var fwVersion = data.Skip(32).Take(4).ToArray();
                        var capabilities = data.Skip(36).Take(4).ToArray();
                        var laddr = data.Skip(40).Take(28).ToArray();
                        var laddr6 = data.Skip(68).Take(28).ToArray();
                        var ipv4_nat_type = data[96];
                        var ipv6_nat_type = data[97];
                        var raddr = data.Skip(98).Take(28).ToArray();
                        var raddr6 = data.Skip(126).Take(28).ToArray();

                        var said = Util.Bytes2Hex(aid);
                        var sdid = Util.Bytes2Hex(did);

                        lock (cacheUsers)
                        {
                            userInfo = cacheUsers.FirstOrDefault(o => string.Equals(o.UserGUID, said, StringComparison.InvariantCultureIgnoreCase));

                            deviceStatus = userInfo?.Devices.FirstOrDefault(o => string.Equals(o.DeviceGUID, sdid, StringComparison.InvariantCultureIgnoreCase));
                        }

                        if (userInfo == null || deviceStatus == null)
                        {
                            if (deviceIpBlackList.ContainsKey(addr) && DateTime.Now.Subtract(deviceIpBlackList[addr]).TotalSeconds < 60)
                            {
                                return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                            }

                            var ctx = http.RequestServices.GetRequiredService<DataContext>();
                            // Check if the device exists
                            var device = await ctx.Devices.FirstOrDefaultAsync(o => o.DeviceGUID == sdid && o.UserGUID == said);

                            // Mark the device as attacker.
                            if (device == null)
                            {
                                deviceIpBlackList[addr] = DateTime.Now;
                                return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                            }

                            var user = await ctx.Users.FirstOrDefaultAsync(o => o.UserGUID == said);

                            // The user is deleted?
                            if (user == null)
                            {
                                deviceIpBlackList[addr] = DateTime.Now;
                                return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                            }

                            await Util.LoadUserInfoAsync(http, user);
                            lock (cacheUsers)
                            {
                                userInfo = cacheUsers.FirstOrDefault(o => string.Equals(o.UserGUID, said, StringComparison.InvariantCultureIgnoreCase));

                                deviceStatus = userInfo?.Devices.FirstOrDefault(o => string.Equals(o.DeviceGUID, sdid, StringComparison.InvariantCultureIgnoreCase));
                            }

                            if (userInfo == null || deviceStatus == null)
                            {
                                deviceIpBlackList[addr] = DateTime.Now;
                                return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                            }

                            deviceIpBlackList.TryRemove(addr, out var dt);
                        }

                        //Console.WriteLine($"-------------------");
                        //Console.WriteLine(Util.Bytes2Hex(data));

                        Array.Copy(laddr, deviceStatus.LocalAddr, laddr.Length);
                        Array.Copy(laddr6, deviceStatus.LocalAddr6, laddr6.Length);
                        Array.Copy(raddr, deviceStatus.RemoteAddr, raddr.Length);
                        Array.Copy(raddr6, deviceStatus.RemoteAddr6, raddr6.Length);

                        deviceStatus.Version = BitConverter.ToUInt32(fwVersion);
                        deviceStatus.Firmware = BitConverter.ToInt64(build);
                        deviceStatus.Capability = BitConverter.ToUInt32(capabilities);
                        deviceStatus.RemoteAddrNatType = ipv4_nat_type;
                        deviceStatus.RemoteAddr6NatType = ipv6_nat_type;
                        deviceStatus.LastActive = DateTime.Now;
                        deviceStatus.Nonce = Util.Bytes2Hex(Util.GenerateRandomBytes(8));
                        deviceStatus.Update();

                        if (deviceStatus.RequestReboot)
                        {
                            deviceStatus.RequestConnectionInfo = null;
                            deviceStatus.RequestWOLInfo = null;
                            deviceStatus.RequestReboot = false;

                            return Results.Json(new { status = RC.SUCCESS, token = userInfo.Token, nonce = deviceStatus.Nonce, reboot = "1" });
                        }

                        resp.Add("status", RC.SUCCESS);
                        resp.Add("token", userInfo.Token);
                        resp.Add("nonce", deviceStatus.Nonce);

                        lock (deviceStatus)
                        {
                            if (deviceStatus.SharedAccounts.Count > 0 || deviceStatus.SharedAccountUpdated)
                            {
                                var buffer = new byte[deviceStatus.SharedAccounts.Count * 16];
                                for (int i = 0; i < deviceStatus.SharedAccounts.Count; i++)
                                {
                                    Util.Hex2Bytes(deviceStatus.SharedAccounts[i]).CopyTo(buffer, i * 16);
                                }
                                deviceStatus.SharedAccountUpdated = false;

                                Util.Encrypt(buffer, hash);
                                resp.Add("accounts", Util.Bytes2Hex(buffer));
                                //Console.WriteLine($"{userInfo.Id}: V:{request.v} Shared Accounts: Sent!");
                            }
                        }

                        if (deviceStatus.RequestConnectionInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestConnectionInfo.Length];
                            Array.Copy(deviceStatus.RequestConnectionInfo, info, deviceStatus.RequestConnectionInfo.Length);
                            Util.Encrypt(info, hash);
                            resp.Add("nat", Util.Bytes2Hex(info));
                            deviceStatus.RequestConnectionInfo = null;
                            Console.WriteLine($"{userInfo.Id}: V:{request.v} NAT: Sent!");
                        }

                        if (deviceStatus.RequestWOLInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestWOLInfo.Length];
                            Array.Copy(deviceStatus.RequestWOLInfo, info, deviceStatus.RequestWOLInfo.Length);
                            Util.Encrypt(info, hash);
                            resp.Add("wol", Util.Bytes2Hex(info));
                            deviceStatus.RequestWOLInfo = null;
                            Console.WriteLine($"{userInfo.Id}: V:{request.v} WOL: Sent!");
                        }

                        return Results.Json(resp);
                    }

                    if (request.v == 2)
                    {
                        var payload = Util.Hex2Bytes(request.Payload);
                        Util.Encrypt(payload, Util.Fixed_Heartbeart_Key);

                        var token = Util.Bytes2Hex(payload.Take(16).ToArray());
                        var nonce = Util.Bytes2Hex(payload.Skip(16).Take(8).ToArray());

                        lock (cacheUsers)
                        {
                            userInfo = cacheUsers.FirstOrDefault(o => string.Equals(o.Token, token, StringComparison.InvariantCultureIgnoreCase));
                            deviceStatus = userInfo?.Devices.FirstOrDefault(o => string.Equals(o.Nonce, nonce, StringComparison.InvariantCultureIgnoreCase));
                        }

                        if (userInfo == null || deviceStatus == null)
                        {
                            return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                        }

                        deviceStatus.LastActive = DateTime.Now;

                        if (deviceStatus.RequestReboot)
                        {
                            deviceStatus.RequestConnectionInfo = null;
                            deviceStatus.RequestWOLInfo = null;
                            deviceStatus.RequestReboot = false;
                            Console.WriteLine($"{userInfo.Id}: V:{request.v} Reboot: Sent!");
                            return Results.Json(new { status = RC.SUCCESS, reboot = "1" });
                        }

                        resp.Add("status", RC.SUCCESS);
                        var hash = payload.Skip(8).Take(16).ToArray();
                        lock (deviceStatus)
                        {
                            if (deviceStatus.SharedAccountUpdated)
                            {
                                var buffer = new byte[deviceStatus.SharedAccounts.Count * 16];
                                for (int i = 0; i < deviceStatus.SharedAccounts.Count; i++)
                                {
                                    Util.Hex2Bytes(deviceStatus.SharedAccounts[i]).CopyTo(buffer, i * 16);
                                }
                                deviceStatus.SharedAccountUpdated = false;
                                Util.Encrypt(buffer, hash);
                                resp.Add("accounts", Util.Bytes2Hex(buffer));
                                //Console.WriteLine($"{userInfo.Id}: V:{request.v} Shared Accounts: Sent!");
                            }
                        }

                        if (deviceStatus.RequestConnectionInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestConnectionInfo.Length];
                            Array.Copy(deviceStatus.RequestConnectionInfo, info, deviceStatus.RequestConnectionInfo.Length);
                            Util.Encrypt(info, hash);
                            resp.Add("nat", Util.Bytes2Hex(info));
                            deviceStatus.RequestConnectionInfo = null;
                            Console.WriteLine($"{userInfo.Id}: V:{request.v} NAT: Sent!");
                        }

                        if (deviceStatus.RequestWOLInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestWOLInfo.Length];
                            Array.Copy(deviceStatus.RequestWOLInfo, info, deviceStatus.RequestWOLInfo.Length);
                            Util.Encrypt(info, hash);
                            resp.Add("wol", Util.Bytes2Hex(info));
                            deviceStatus.RequestWOLInfo = null;
                            Console.WriteLine($"{userInfo.Id}: V:{request.v} WOL: Sent!");
                        }

                        return Results.Json(resp);
                    }

                    if (request.v == 3)
                    {
                        var payload = Util.Hex2Bytes(request.Payload);
                        Util.Encrypt(payload, Util.Fixed_Heartbeart_Key);

                        var token = Util.Bytes2Hex(payload.Take(16).ToArray());
                        var nonce = Util.Bytes2Hex(payload.Skip(16).Take(8).ToArray());
                        var userGUID = Util.Bytes2Hex(payload.Skip(24).Take(16).ToArray());

                        lock (cacheUsers)
                        {
                            userInfo = cacheUsers.FirstOrDefault(o => string.Equals(o.Token, token, StringComparison.InvariantCultureIgnoreCase));
                            deviceStatus = userInfo?.Devices.FirstOrDefault(o => string.Equals(o.Nonce, nonce, StringComparison.InvariantCultureIgnoreCase));
                        }

                        if (userInfo == null || deviceStatus == null)
                        {
                            return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                        }

                        deviceStatus.LastActive = DateTime.Now;

                        lock (deviceStatus)
                        {
                            if (!deviceStatus.SharedAccounts.Contains(userGUID))
                            {
                                return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                            }
                        }

                        lock (cacheUsers)
                        {
                            sharedAccount = cacheUsers.FirstOrDefault(o => o.UserGUID == userGUID);
                        }

                        if(sharedAccount == null)return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });

                        Console.WriteLine($"{userInfo.Id}: V:{request.v} Shared Account Token: Sent!");
                        return Results.Json(new { status = RC.SUCCESS, token = sharedAccount.Token });
                    }

                    return Results.Json(new { status = RC.INVALID_PARAMETERS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Bind Device
            app.MapPost("/api/v2/bind_device", async (HttpContext http, RequestBindDevice request) =>
            {
                try
                {
                    var addr = http.Connection.RemoteIpAddress.ToString();
                    var aid = request.Uid?.Trim().ToLower();

                    if (!Util.AllowAccess(addr))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/bind_device", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    var response_data = new { status = RC.SUCCESS };
                    var ctx = http.RequestServices.GetRequiredService<DataContext>();
                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(aid)
                        || string.IsNullOrEmpty(request.Payload))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }
                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => u.UserGUID == aid);
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    var data = Util.Hex2Bytes(request.Payload);
                    var key = Util.Hex2Bytes(request.Uid);
                    Util.GetDataByKey3(data, key);

                    var data1 = new byte[8];
                    Array.Copy(data, 0, data1, 0, 8);
                    int model = data[8];
                    var name = System.Text.Encoding.UTF8.GetString(data, 40, data.Length - 40);
                    var did = Util.Bytes2Hex(data1);

                    var device = await ctx.Devices.FirstOrDefaultAsync(o=> o.DeviceGUID == did);

                    var oaid = device?.UserGUID;

                    if (device == null)
                    {
                        // Add new device
                        device = new Device
                        {
                            UserGUID = aid,
                            DeviceGUID = did,
                            Status = DeviceState.Normal,
                            Model = model,
                            Name = name,
                            RegisteredAt = DateTime.UtcNow
                        };
                        ctx.Devices.Add(device);
                    }
                    else
                    {
                        if (device.UserGUID == aid)
                        {
                            return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                        }

                        device.Status = DeviceState.Normal;
                        device.UserGUID = aid;
                        ctx.Devices.Update(device);
                    }

                    await ctx.SaveChangesAsync();

                    UserInfo? userInfo2 = null;
                    lock (cacheUsers)
                    {
                        if (oaid != null) userInfo2 = cacheUsers.FirstOrDefault(u => u.UserGUID == oaid);
                    }

                    DeviceStatus ds = null;
                    if (userInfo2 != null)
                    {
                        lock (userInfo2.Devices)
                        {
                            ds = userInfo2?.Devices.FirstOrDefault(d => d.DeviceGUID == did);
                            userInfo2?.Devices.Remove(ds);
                        }
                    }

                    if (ds == null)
                    {
                        ds = new DeviceStatus
                        {
                            DeviceId = device.DeviceId,
                            DeviceGUID = did,
                            Model = (byte)model,
                            LastActive = DateTime.Now
                        };
                    }
                    
                    ds.DeviceName = name;
                    ds.Update();

                    lock (userInfo.Devices)
                    {
                        userInfo.Devices.Add(ds);
                    }

                    return Results.Json(new { status = RC.SUCCESS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Device Rename
            app.MapPost("/api/v2/rename_device", async (HttpContext http, RequestRenameDevice request) =>
            {
                try
                {
                    var addr = http.Connection.RemoteIpAddress.ToString();
                    if (!Util.AllowAccess(addr))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/rename_device", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    long id = 0;

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(request.Uid)
                        || !long.TryParse(request.Did, out id))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid, StringComparison.InvariantCultureIgnoreCase));
                    }

                    if (userInfo?.Token != token)
                    {
                        return Results.Json(new { status = RC.TOKEN_EXPIRED });
                    }


                    var ctx = http.RequestServices.GetRequiredService<DataContext>();
                    DeviceStatus ds = null;
                    int result = 0;
                    lock (cacheUsers)
                    {
                        ds = userInfo.Devices.FirstOrDefault(d => d.DeviceId == id);
                    }

                    if (ds != null)
                    {
                        result = await ctx.Devices.Where(d => d.DeviceId == ds.DeviceId && d.UserGUID == userInfo.UserGUID).ExecuteUpdateAsync(o => o.SetProperty(d => d.Name, request.Title));
                        ds.DeviceName = request.Title;
                        ds.Update();
                    }
                    else
                    {
                        result = await ctx.SubDevices.Where(d => ctx.SubAccounts.Where(a => a.AccountId == userInfo.Id).Select(a=> a.SubAccountId).Contains(d.SubAccountId) && d.DeviceId == id && d.Status == DeviceState.Normal).ExecuteUpdateAsync(o => o.SetProperty(d => d.Name, request.Title));
                    }

                    if (result == 1)
                    {
                        return Results.Json(new { status = RC.SUCCESS });
                    }
                    else
                    {
                        return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Device Command
            app.MapPost("/api/v2/request_device", async (HttpContext http, RequestSendCommandToDevice request) =>
            {
                try
                {
                    var addr = http.Connection.RemoteIpAddress.ToString();
                    if (!Util.AllowAccess(addr))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/request_device", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(request.Uid)
                        || string.IsNullOrEmpty(request.cmd)
                        || !long.TryParse(request.Did, out var deviceId))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid, StringComparison.InvariantCultureIgnoreCase));
                    }

                    if (userInfo?.Token != token)
                    {
                        Console.WriteLine($"{DateTime.Now}: Send Command: mismatch token!");
                        return Results.Json(new { status = RC.TOKEN_EXPIRED });
                    }

                    var data = Util.Hex2Bytes(request.Did);
                    var key = Util.Hex2Bytes(request.Uid);
                    Util.GetDataByKey3(data, key);
                    var did = Util.Bytes2Hex(data);

                    DeviceStatus ds = null;
                    lock (userInfo.Devices)
                    {
                        ds = userInfo.Devices.FirstOrDefault(d => d.DeviceId == deviceId);
                    }

                    if (ds == null)
                    {
                        var ctx = http.RequestServices.GetRequiredService<DataContext>();
                        // check if the account has permission to send request to sub device.
                        var dev = (from d in ctx.Devices
                                 join sd in ctx.SubDevices
                                 on d.DeviceId equals sd.DeviceId
                                 join sa in ctx.SubAccounts
                                 on sd.SubAccountId equals sa.SubAccountId
                                 where 
                                 sa.Status == SubAccountStatus.Approved &&
                                 sd.Status == DeviceState.Normal &&
                                 sa.AccountId == userInfo.Id &&
                                 d.DeviceId == deviceId
                                 select d).FirstOrDefault();

                        if (dev != null)
                        {
                            ds = allDevices.FirstOrDefault(d => d.DeviceId == dev.DeviceId);
                        }
                    }

                    if (ds == null)
                    {
                        return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                    }

                    switch (request.cmd)
                    {
                        case "nat":
                            {
                                byte[] nat = Util.Hex2Bytes(request.Payload); // requested addr
                                Util.GetDataByKey3(nat, key);
                                ds.RequestConnectionInfo = nat;
                                Console.WriteLine($"{DateTime.Now}: NAT: Requested!");
                            }
                            break;
                        case "wol":
                            {

                                var wolInfo = JsonSerializer.Deserialize<JsonElement>(request.Payload);
                                byte[] wol = new byte[9];
                                if (wolInfo.TryGetProperty("type", out var typePro) && typePro.GetInt32() == 1)
                                {
                                    wol[0] = 1;
                                    if (wolInfo.TryGetProperty("mac", out var macPro))
                                    {
                                        string macStr = macPro.GetString();
                                        var segs = Regex.Split(macStr, ":|-");
                                        if (segs.Length != 6)
                                        {
                                            return Results.Json(new { status = RC.INVALID_PARAMETERS });
                                        }

                                        var mac = new byte[6];
                                        for (int i = 0; i < segs.Length; i++)
                                        {
                                            mac[i] = Convert.ToByte(segs[i], 16);
                                        }
                                        mac.CopyTo(wol, 1);
                                    }
                                }
                                ds.RequestWOLInfo = wol;
                                Console.WriteLine($"{DateTime.Now}: WOL: Requested!");
                            }
                            break;
                        case "reboot":
                            ds.RequestReboot = true;
                            Console.WriteLine($"{DateTime.Now}: Reboot: Requested!");
                            break;
                        default:
                            break;
                    }

                    return Results.Json(new { status = RC.SUCCESS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Invitation
            app.MapPost("/api/v2/send_invitation", async (HttpContext http, RequestInvitation request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 1000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/send_invitation", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    Invitation invitation = null;
                    var now = DateTime.Now;
                    string email = request.Email.ToLower().Trim();
                    if (string.Equals(email, userInfo.Email.ToLower()))
                    {
                        Results.Json(new { status = RC.INVALID_INVITATION });
                    }

                    var emailHash = Util.Bytes2Hex(MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(email)));

                    lock (invitations)
                    {
                        invitation = invitations.FirstOrDefault(o => o.InvitedBy == userInfo.Id && o.EmailHash == emailHash);
                        invitations.RemoveAll(o => now.Subtract(o.InvitedAt).TotalDays > 7);
                        if (invitation == null)
                        {
                            invitation = new Invitation { InvitedBy = userInfo.Id, EmailHash = emailHash, Email = request.Email, Name = request.Name };
                            invitations.Add(invitation);
                        }
                    }
                    // renew the invitaton
                    invitation.InvitedAt = now;
                    invitation.InvitationCode = (Random.Shared.Next() % 1000000).ToString("000000");

                    EmailHelper.SendInvitationEmail(request.Name, request.Email, request.InvitedBy, invitation.InvitationCode);

                    return Results.Json(new { status = RC.SUCCESS, code = invitation.InvitationCode });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Accept Invitation
            app.MapPost("/api/v2/accept_invitation", async (HttpContext http, RequestAcceptInvitation request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 3000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/accept_invitation", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    Invitation invitation = null;
                    var now = DateTime.Now;
                    var ctx = http.RequestServices.GetRequiredService<DataContext>();

                    lock (invitations)
                    {
                        invitation = invitations.FirstOrDefault(o => o.EmailHash == userInfo.EmailHash && string.Equals(o.InvitationCode, request.InvitationCode, StringComparison.InvariantCultureIgnoreCase));
                        invitations.RemoveAll(o => now.Subtract(o.InvitedAt).TotalDays > 7);

                        if (invitation != null) invitations.Remove(invitation);
                    }

					// Get parent account information
                    var user = await ctx.Users.FirstOrDefaultAsync(o => o.UserId == invitation.InvitedBy);

                    if (user == null) return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });

                    if (invitation == null)
                    {
                        return Results.Json(new { status = RC.INVITATION_TOKEN_MISMATCH });
                    }

                    if (now.Subtract(invitation.InvitedAt).TotalDays > 7)
                    {
                        return Results.Json(new { status = RC.TOKEN_EXPIRED });
                    }

                    var subaccount = await ctx.SubAccounts.FirstOrDefaultAsync(o => o.ParentAccountId == invitation.InvitedBy && o.AccountId == userInfo.Id);
                    
                    if (subaccount != null)
                    {
                        // The main account must approve it again.
                        if (subaccount.Status != SubAccountStatus.Approved)
                        {
                            subaccount.Status = SubAccountStatus.Accepted;
                            subaccount.CreatedAt = DateTime.Now;
                        }
                        subaccount.Name = invitation.Name;
                        ctx.SubAccounts.Update(subaccount);
                    }
                    else
                    {
                        subaccount = new SubAccount { AccountId = userInfo.Id, ParentAccountId = invitation.InvitedBy, Status = SubAccountStatus.Accepted, Name = invitation.Name, Email = invitation.Email, CreatedAt = DateTime.Now };
                        ctx.SubAccounts.Add(subaccount);
                    }

                    await ctx.SaveChangesAsync();

                    return Results.Json(new { status = RC.SUCCESS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Update State
            app.MapPost("/api/v2/update_subaccount_state", async (HttpContext http, RequestUpdateSubAccountState request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 300))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/update_subaccount_state", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid) || request.State < (int)SubAccountStatus.Approved || request.State >= (int)SubAccountStatus.MAX)
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    SubAccountStatus newStatus = (SubAccountStatus)request.State;
                    var ctx = http.RequestServices.GetRequiredService<DataContext>();

                    int result = 0;
                    try
                    {
                        ctx.Database.BeginTransaction();
                        result = await ctx.SubAccounts.Where(o => o.ParentAccountId == userInfo.Id && o.SubAccountId == request.AccountId).ExecuteUpdateAsync(o => o.SetProperty(d => d.Status, newStatus));

                        if (result == 1 && newStatus == SubAccountStatus.Deleted)
                        {
                            // mark all sub devices to be deleted
                            await ctx.SubDevices.Where(o => o.SubAccountId == request.AccountId).ExecuteUpdateAsync(o => o.SetProperty(d => d.Status, DeviceState.Deleted));
                        }

                        ctx.Database.CommitTransaction();

                        if (result == 1)
                        {
                            var subdevs = await ctx.SubDevices.Where(o => o.SubAccountId == request.AccountId).Select(o => new { o.DeviceId, o.Status }).ToListAsync();

                            var sharedAccountGUID = (from user in ctx.Users 
                                       join sa in ctx.SubAccounts
                                       on user.UserId equals sa.AccountId
                                       where sa.SubAccountId == request.AccountId
                                       select user.UserGUID).FirstOrDefault();

                            foreach (var dev in subdevs)
                            {
                                lock (allDevices)
                                {
                                    var ds = allDevices.FirstOrDefault(d => d.DeviceId == dev.DeviceId);

                                    if (ds != null)
                                    {
                                        lock (ds)
                                        {
                                            if (newStatus == SubAccountStatus.Approved && dev.Status == DeviceState.Normal)
                                            {
                                                ds.AddSharedAccount(sharedAccountGUID);
                                            }
                                            else
                                            {
                                                ds.RemoveSharedAccount(sharedAccountGUID);
                                            }
                                        }
                                    }
                                    
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        ctx.Database.RollbackTransaction();
                        throw ex;
                    }

                    return Results.Json(new { status = (result == 1) ? RC.SUCCESS : RC.SUBACCOUNT_NOT_EXISTS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Rename
            app.MapPost("/api/v2/rename_subaccount", async (HttpContext http, RequestRenameSubAccount request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 3000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/rename_subaccount", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid) || string.IsNullOrEmpty(request.NewName) || request.NewName?.Length > 100)
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();
                    var result = await ctx.SubAccounts.Where(o => o.ParentAccountId == userInfo.Id && o.SubAccountId == request.AccountId).ExecuteUpdateAsync(o => o.SetProperty(d => d.Name, request.NewName));

                    return Results.Json(new { status = (result == 1) ? RC.SUCCESS : RC.SUBACCOUNT_NOT_EXISTS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Get List
            app.MapPost("/api/v2/get_subaccount_list", async (HttpContext http, RequestGetSubAccountList request) =>
            {
                try
                {
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/get_subaccount_list", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();
                    var boundDevices = ctx.Devices.Where(o => o.UserGUID == userInfo.UserGUID && o.Status == DeviceState.Normal)
                    .Select(o => new { id = o.DeviceId, name = o.Name, model = o.Model}).ToList();

                    //var subdevices = (from acc in ctx.SubAccounts
                    //              join subdev in ctx.SubDevices
                    //              on acc.SubAccountId equals subdev.SubAccountId
                    //              where acc.ParentAccountId == userInfo.Id && 
                    //              acc.Status == SubAccountStatus.Approved &&
                    //              subdev.Status == DeviceState.Normal
                    //              select subdev.DeviceId).ToList();

                    var list = ctx.SubAccounts.Where(o=> o.ParentAccountId == userInfo.Id && o.Status < SubAccountStatus.Deleted).Select(o => new {
                        id = o.SubAccountId,
                        name = o.Name, 
                        email = o.Email,
                        status = (int)o.Status,
                        createdAt = o.CreatedAt.ToUniversalTime(),
                        devices = ctx.SubDevices.Where(sd=> sd.SubAccountId == o.SubAccountId && sd.Status == DeviceState.Normal).Select(sd => sd.DeviceId).ToList(),
                    }).ToList();

                    return Results.Json(new { status = RC.SUCCESS, devices = boundDevices, accounts=list});
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Modify Sub Device
            app.MapPost("/api/v2/modify_subdevice", async (HttpContext http, RequestModifySubDevice request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 300))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/modify_subdevice", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };
                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo, subUserInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    // check if the device is valid
                    DeviceStatus ds = null;
                    lock (userInfo.Devices)
                    {
                        ds = userInfo.Devices.FirstOrDefault(d => d.DeviceId == request.DeviceId);
                    }

                    if (ds == null)
                    {
                        return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                    }

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();

                    // check if the account id is valid
                    var subaccount = ctx.SubAccounts.Where(o=> o.ParentAccountId == userInfo.Id && o.SubAccountId == request.AccountId && o.Status == SubAccountStatus.Approved).SingleOrDefault();

                    if (subaccount == null)
                    {
                        return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                    }

                    // check if the sub account has the sub device in database
                    var subdevice = ctx.SubDevices.Where(o => o.DeviceId == request.DeviceId && o.SubAccountId == request.AccountId).SingleOrDefault();
                    
                    bool dataChanged = false;

                    lock (cacheUsers)
                    {
                        if (request.IsAdd)
                        {
                            // insert new sub device to database if it does not exist
                            if (subdevice == null)
                            {
                                var newSubDev = new SubDevice
                                {
                                    DeviceId = ds.DeviceId,
                                    SubAccountId = request.AccountId,
                                    Status = DeviceState.Normal,
                                    Name = ds.DeviceName,
                                    CreatedAt = DateTime.Now,
                                };

                                ctx.SubDevices.Add(newSubDev);
                            }
                            else
                            {
                                // update the entry if it exists
                                subdevice.Name = ds.DeviceName;
                                subdevice.Status = DeviceState.Normal;
                                ctx.SubDevices.Update(subdevice);
                            }

                            dataChanged = true;
                        }
                        else
                        {
                            // mark the sub device as deleted
                            if (subdevice != null && subdevice.Status != DeviceState.Deleted)
                            {
                                subdevice.Status = DeviceState.Deleted;
                                ctx.SubDevices.Update(subdevice);
                                dataChanged = true;
                            }
                        }
                    }

                    if (dataChanged) await ctx.SaveChangesAsync();

                    var sharedAccountGUID = ctx.Users.FirstOrDefault(o => o.UserId == subaccount.AccountId)?.UserGUID;

                    lock (ds)
                    {
                        if (request.IsAdd)
                        {
                            ds.AddSharedAccount(sharedAccountGUID);
                        }
                        else
                        {
                            ds.RemoveSharedAccount(sharedAccountGUID);
                        }
                    }

                    return Results.Json(new { status = RC.SUCCESS});
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Get Main Accounts
            app.MapPost("/api/v2/get_main_accounts", async (HttpContext http, RequestGetMainAccountList request) =>
            {
                try
                {
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/get_main_accounts", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };
                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo, subUserInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();

                    // check if the account id is valid
                    // Do we allow the main account to re-active deleted sub device by sub account? or add an option to unsubscribe from main account?
                    var subaccount = from sa in ctx.SubAccounts
                                     join a in ctx.Users
                                     on sa.ParentAccountId equals a.UserId
                                     where sa.AccountId == userInfo.Id &&
                                     sa.Status == SubAccountStatus.Approved
                                     select new
                                     {
                                         id = a.UserId,
                                         name = a.Name,
                                         email = a.Email,
                                     };

                    return Results.Json(new { status = RC.SUCCESS, result = subaccount });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Sub Account Disconnect Main Account
            app.MapPost("/api/v2/disconnect_main_account", async (HttpContext http, RequestDisconnectMainAccount request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 100))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/api/v2/disconnect_main_account", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };
                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.Uid))
                    {
                        response_data = new { status = RC.INVALID_PARAMETERS };
                        return Results.Json(response_data);
                    }

                    var token = Util.DecodeUserToken(request.Token);

                    // check if user exists in cache
                    UserInfo? userInfo, subUserInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => string.Equals(u.UserGUID, request.Uid));
                    }

                    if (userInfo?.Token != token)
                    {
                        response_data = new { status = RC.TOKEN_MISMATCH };
                        return Results.Json(response_data);
                    }

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();

                    // check if the account id is valid
                    // Do we allow the main account to re-active deleted sub device by sub account? or add an option to unsubscribe from main account?
                    try
                    {
                        var account = ctx.SubAccounts.Where(o => o.ParentAccountId == request.AccountId && o.AccountId == userInfo.Id).FirstOrDefault();

                        if (account == null)
                        {
                            return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                        }

                        ctx.Database.BeginTransaction();
                        
                        var result = await ctx.SubAccounts.Where(o => o.ParentAccountId == request.AccountId && o.AccountId == userInfo.Id).ExecuteUpdateAsync(o => o.SetProperty(a => a.Status, SubAccountStatus.Deleted));

                        if (result == 1)
                        {
                            // mark all sub devices to be deleted
                            await ctx.SubDevices.Where(o => o.SubAccountId == account.SubAccountId).ExecuteUpdateAsync(o => o.SetProperty(d => d.Status, DeviceState.Deleted));

                            var mainUser = await ctx.Users.FirstOrDefaultAsync(o => o.UserId == account.ParentAccountId);

                            var sharedDevices = ctx.SubDevices.Where(o => o.SubAccountId == account.SubAccountId).Select(o => o.DeviceId).ToList();

                            lock (allDevices)
                            {
                                var devs = allDevices.Where(d => sharedDevices.Contains(d.DeviceId));

                                foreach (var dev in devs)
                                {
                                    lock (dev)
                                    {
                                        dev.RemoveSharedAccount(userInfo.UserGUID);
                                    }
                                }
                            }
                        }

                        ctx.Database.CommitTransaction();
                        return Results.Json(new { status = result == 1 ? RC.SUCCESS : RC.ACCOUNT_NOT_EXISTS });
                    }
                    catch (Exception ex)
                    {
                        ctx.Database.RollbackTransaction();
                        throw ex;
                    }
                
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion
        }
    }
}