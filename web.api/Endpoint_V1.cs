using aurga.Common;
using aurga.Data;
using aurga.Model;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.Data;
using System.Text.Json;

namespace aurga
{
    public static class Endpoint_V1
    {
        public static void MapV1Endpoints(this WebApplication app)
        {
            var cacheUsers = SharedStore.Users;
            var invitations = SharedStore.Invitations;
            var allDevices = SharedStore.AllDevices;

            #region Hello
            app.MapGet("/hello/{name}", (string name) =>
            {
                var data = new { message = $"Hello, {name}" };
                return Results.Ok(data);
            });
            #endregion

            #region Verify Activation
            app.MapPost("/verify/activation", async (HttpContext http, ReguestActivationVerification request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 1000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.VerificationCode))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/verify/activation", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    //bool need_fill_devices = false;
                    // check if user exists in cache
                    UserInfo? userInfo;
                    lock (cacheUsers)
                    {
                        userInfo = cacheUsers.FirstOrDefault(u => u.ActivationVerificationCode == request.VerificationCode && u.ActivationToken == request.Token);
                    }

                    if (userInfo == null)
                    {
                        return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                    }

                    if (userInfo.Activated)
                    {
                        return Results.Json(new { status = RC.ACCOUNT_IS_ACTIVATED });
                    }

                    var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.UserGUID == userInfo.UserGUID);
                    if (user == null)
                    {
                        // Invalid user
                        return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                    }

                    if (DateTime.Now.Subtract(userInfo.ActivationVerificationTime).TotalMinutes > 10)
                    {
                        Util.GenerateNewActivationCodeIfNecessary(userInfo);
                        return Results.Json(new { status = RC.TOKEN_EXPIRED, token = userInfo.ActivationToken });
                    }

                    user.Activated = true;
                    userInfo.Activated = true;

                    EmailHelper.SendActivationSuccess(user.Email);
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

            #region Reset Password
            app.MapPost("/sendemail/resetpassword", async (HttpContext http, RequestResetPassword request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/sendemail/resetpassword", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (string.IsNullOrEmpty(request.Email))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }


                    // Check if user exists
                    var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLower());
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
            app.MapPost("/verify/resetpassword", async (HttpContext http, RequestResetPasswordVerification request) =>
            {
                try
                {
                    if (!Util.AllowAccess(http.Connection.RemoteIpAddress.ToString(), 1000))
                    {
                        return Results.Json(new { status = RC.IP_RESTRICT });
                    }

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token) || string.IsNullOrEmpty(request.VerificationCode) || string.IsNullOrEmpty(request.NewPassword))
                    {
                        return Results.Json(new { status = RC.INVALID_PARAMETERS });
                    }

#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/verify/resetpassword", content);
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

                    var pwdHash = Util.Bytes2Hex(MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(request.NewPassword)));

                    user.PasswordHash = pwdHash;
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
            app.MapPost("/device/heartbeat", async (HttpContext http, RequestHeartbeat request) =>
            {
                var response_data = new { status = RC.SUCCESS };
                string natPayload = null;
                string wolPayload = null;

                // Validate input
                if ((request.v == 1 && request.Payload?.Length != 342) || (request.v == 2 && request.Payload?.Length != 48))
                {
                    response_data = new { status = RC.INVALID_PARAMETERS };
                    return Results.Json(response_data);
                }

                //if (hit) return Results.BadRequest();
                //hit = true;

                try
                {
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/device/heartbeat", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif
                    UserInfo? userInfo;
                    DeviceStatus? deviceStatus;

                    if (request.v == 1)
                    {
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
                            //System.Diagnostics.Debug.WriteLine(sb.ToString());
                            response_data = new { status = RC.DEVICE_NOT_EXISTS };
                            return Results.Json(response_data);
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

                        if (deviceStatus.RequestConnectionInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestConnectionInfo.Length];
                            Array.Copy(deviceStatus.RequestConnectionInfo, info, deviceStatus.RequestConnectionInfo.Length);
                            Util.Encrypt(info, hash);
                            natPayload = Util.Bytes2Hex(info);
                            deviceStatus.RequestConnectionInfo = null;
                            Console.WriteLine($"{DateTime.Now}: V:{request.v} NAT: Sent!");
                        }

                        if (deviceStatus.RequestWOLInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestWOLInfo.Length];
                            Array.Copy(deviceStatus.RequestWOLInfo, info, deviceStatus.RequestWOLInfo.Length);
                            Util.Encrypt(info, hash);
                            wolPayload = Util.Bytes2Hex(info);
                            deviceStatus.RequestWOLInfo = null;
                            Console.WriteLine($"{DateTime.Now}: V:{request.v} WOL: Sent!");
                            //return Results.Json(new { status = RC.SUCCESS, token = userInfo.Token, nonce = deviceStatus.Nonce, payload = resp_payload });
                        }

                        if (string.IsNullOrEmpty(natPayload) && string.IsNullOrEmpty(wolPayload))
                        {
                            return Results.Json(new { status = RC.SUCCESS, token = userInfo.Token, nonce = deviceStatus.Nonce });
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(natPayload) && !string.IsNullOrEmpty(wolPayload))
                            {
                                return Results.Json(new { status = RC.SUCCESS, token = userInfo.Token, nonce = deviceStatus.Nonce, nat = natPayload, wol = wolPayload });
                            }
                            else if (!string.IsNullOrEmpty(natPayload))
                            {
                                return Results.Json(new { status = RC.SUCCESS, token = userInfo.Token, nonce = deviceStatus.Nonce, nat = natPayload });
                            }
                            else
                            {
                                return Results.Json(new { status = RC.SUCCESS, token = userInfo.Token, nonce = deviceStatus.Nonce, wol = wolPayload });
                            }
                        }
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
                            response_data = new { status = RC.DEVICE_NOT_EXISTS };
                            return Results.Json(response_data);
                        }

                        deviceStatus.LastActive = DateTime.Now;

                        if (deviceStatus.RequestConnectionInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestConnectionInfo.Length];
                            Array.Copy(deviceStatus.RequestConnectionInfo, info, deviceStatus.RequestConnectionInfo.Length);
                            var hash = payload.Skip(8).Take(16).ToArray();

                            Util.Encrypt(info, hash);
                            natPayload = Util.Bytes2Hex(info);
                            deviceStatus.RequestConnectionInfo = null;
                            Console.WriteLine($"{DateTime.Now}: V:{request.v} NAT: Sent!");
                        }

                        if (deviceStatus.RequestWOLInfo?.Length > 0)
                        {
                            var info = new byte[deviceStatus.RequestWOLInfo.Length];
                            Array.Copy(deviceStatus.RequestWOLInfo, info, deviceStatus.RequestWOLInfo.Length);
                            var hash = payload.Skip(8).Take(16).ToArray();

                            Util.Encrypt(info, hash);
                            wolPayload = Util.Bytes2Hex(info);
                            deviceStatus.RequestWOLInfo = null;
                            Console.WriteLine($"{DateTime.Now}: V:{request.v} WOL: Sent!");
                        }

                        if (string.IsNullOrEmpty(natPayload) && string.IsNullOrEmpty(wolPayload))
                        {
                            return Results.Json(new { status = RC.SUCCESS });
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(natPayload) && !string.IsNullOrEmpty(wolPayload))
                            {
                                return Results.Json(new { status = RC.SUCCESS, nat = natPayload, wol = wolPayload });
                            }
                            else if (!string.IsNullOrEmpty(natPayload))
                            {
                                return Results.Json(new { status = RC.SUCCESS, nat = natPayload });
                            }
                            else
                            {
                                return Results.Json(new { status = RC.SUCCESS, wol = wolPayload });
                            }
                        }
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

            #region Device Bind
            app.MapPost("/device/register", async (HttpContext http, RequestBindDevice request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/device/register", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    var response_data = new { status = RC.SUCCESS };

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

                    var device = await http.RequestServices.GetRequiredService<DataContext>().Devices.FirstOrDefaultAsync(o=> o.DeviceGUID == did);

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
                        http.RequestServices.GetRequiredService<DataContext>().Devices.Add(device);
                    }
                    else
                    {
                        if (device.UserGUID == aid)
                        {
                            return Results.Json(new { status = RC.ACCOUNT_NOT_EXISTS });
                        }

                        device.Status = DeviceState.Normal;
                        device.UserGUID = aid;
                        http.RequestServices.GetRequiredService<DataContext>().Devices.Update(device);
                    }

                    await http.RequestServices.GetRequiredService<DataContext>().SaveChangesAsync();

                    lock (cacheUsers)
                    {
                        UserInfo? userInfo2 = null;
                        if (oaid != null) userInfo2 = cacheUsers.FirstOrDefault(u => u.UserGUID == oaid);
                        var ds = userInfo2?.Devices.FirstOrDefault(d => d.DeviceGUID == did);
                        userInfo2?.Devices.Remove(ds);
                        if (ds == null)
                        {
                            ds = new DeviceStatus
                            {
                                DeviceId = device.DeviceId,
                                DeviceGUID = did,
                                DeviceName = name,
                                Model = (byte)model,
                                LastActive = DateTime.Now
                            };

                            ds.Update();
                        }

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

            #region Device Unbind
            app.MapPost("/device/unregister", async (HttpContext http, RequestUnbindDevice request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/device/unregister", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(request.Uid)
                        || string.IsNullOrEmpty(request.Did))
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

                    var data = Util.Hex2Bytes(request.Did);
                    var key = Util.Hex2Bytes(request.Uid);
                    Util.GetDataByKey3(data, key);
                    var did = Util.Bytes2Hex(data);

                    // Add new device
                    var device = await http.RequestServices.GetRequiredService<DataContext>().Devices.FirstOrDefaultAsync(o=> o.DeviceGUID == did);
                    if (device == null)
                    {
                        return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                    }

                    http.RequestServices.GetRequiredService<DataContext>().Devices.Remove(device);
                    await http.RequestServices.GetRequiredService<DataContext>().SaveChangesAsync();

                    lock (cacheUsers)
                    {
                        userInfo.Devices.RemoveAll(d => d.DeviceGUID == did);
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
            app.MapPost("/device/rename", async (HttpContext http, RequestRenameDevice request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/device/rename", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(request.Uid)
                        || string.IsNullOrEmpty(request.Did))
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

                    var data = Util.Hex2Bytes(request.Did);
                    var key = Util.Hex2Bytes(request.Uid);
                    Util.GetDataByKey3(data, key);
                    var did = Util.Bytes2Hex(data);

                    // Add new device
                    var device = await http.RequestServices.GetRequiredService<DataContext>().Devices.FirstOrDefaultAsync(o=>o.DeviceGUID == did);
                    if (device == null)
                    {
                        return Results.Json(new { status = RC.DEVICE_NOT_EXISTS });
                    }

                    device.Name = request.Title;

                    http.RequestServices.GetRequiredService<DataContext>().Devices.Update(device);
                    await http.RequestServices.GetRequiredService<DataContext>().SaveChangesAsync();
                    lock (cacheUsers)
                    {
                        var ds = userInfo.Devices.FirstOrDefault(o => o.DeviceGUID == did);
                        if (ds != null)
                        {
                            ds.DeviceName = request.Title;
                            ds.Update();
                        }
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

            #region Device Command
            // The client sends connection request to the device.
            app.MapPost("/device/command", async (HttpContext http, RequestSendCommandToDevice request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/device/command", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(request.Uid)
                        || string.IsNullOrEmpty(request.Did))
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
                        Console.WriteLine($"{DateTime.Now}: NAT: mismatch token!");
                        return Results.Json(new { status = RC.TOKEN_EXPIRED });
                    }

                    var data = Util.Hex2Bytes(request.Did);
                    var key = Util.Hex2Bytes(request.Uid);
                    Util.GetDataByKey3(data, key);
                    var did = Util.Bytes2Hex(data);
                    byte[] nat = null;
                    byte[] wol = null;

                    if (null != request.NAT)
                    {
                        nat = Util.Hex2Bytes(request.NAT); // requested addr
                        Util.GetDataByKey3(nat, key);
                    }

                    if (null != request.WOL)
                    {
                        wol = Util.Hex2Bytes(request.WOL); // requested addr
                        Util.GetDataByKey3(wol, key);
                    }

                    lock (cacheUsers)
                    {
                        var dev = userInfo.Devices.FirstOrDefault(d => d.DeviceGUID == did);
                        if (dev != null)
                        {
                            if (nat != null)
                            {
                                dev.RequestConnectionInfo = nat;
                                Console.WriteLine($"{DateTime.Now}: NAT: Requested!");
                            }

                            if (wol != null)
                            {
                                dev.RequestWOLInfo = wol;
                                Console.WriteLine($"{DateTime.Now}: WOL: Requested!");
                            }
                        }
                        else
                        {
                            Console.WriteLine($"{DateTime.Now}: Command: {did} is not found!");
                        }
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

            #region Device Accept Connection
            // The device acknowledge the connection request from the client.
            app.MapPost("/device/accept_connection", async (HttpContext http, RequestDeviceAcceptConnection request) =>
            {
                try
                {
                    //var addr = http.Connection.RemoteIpAddress.ToString();
                    //if (!AllowAccess(addr))
                    //{
                    //    return Results.Json(new { status = RC.IP_RESTRICT });
                    //}
#if MIRROR
                    var httpClient = new HttpClient();
                    var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/device/accept_connection", content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    return Results.Json(JsonSerializer.Deserialize<object>(responseString));
#endif

                    // Validate input
                    if (string.IsNullOrEmpty(request.Token)
                        || string.IsNullOrEmpty(request.Uid)
                        || string.IsNullOrEmpty(request.Did))
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

                    var data = Util.Hex2Bytes(request.Did);
                    var key = Util.Hex2Bytes(request.Uid);
                    Util.GetDataByKey3(data, key);
                    var did = Util.Bytes2Hex(data);

                    lock (cacheUsers)
                    {
                        var dev = userInfo.Devices.FirstOrDefault(d => d.DeviceGUID == did);
                        if (dev != null) dev.RequestConnectionInfo = null;
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

            #region Account Deactivate Request
            app.MapPost("/account/deactivate_request", async (HttpContext http, RequestAccountDeactivate request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/account/deactivate_request", content);
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

                    var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.UserGUID == userInfo.UserGUID);

                    if (user == null)
                    {
                        response_data = new { status = RC.ACCOUNT_NOT_EXISTS };
                        return Results.Json(response_data);
                    }

                    Util.GenerateDeactivationCodeIfNecessary(userInfo);
                    return Results.Json(new { status = RC.SUCCESS });
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    return Results.Json(new { status = RC.EXCEPTION });
                }
            });
            #endregion

            #region Account Deactivate Confirm
            app.MapPost("/account/deactivate_confirm", async (HttpContext http, RequestAccountDeactivateConfirm request) =>
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
                    var response = await httpClient.PostAsync($"{SharedStore.MIRROR_URL}/account/deactivate_confirm", content);
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

                    if (userInfo?.DeactivationVerificationCode != request.Code)
                    {
                        response_data = new { status = RC.VERIFICATION_CODE_MISMATCH };
                        return Results.Json(response_data);
                    }

                    var user = await http.RequestServices.GetRequiredService<DataContext>().Users.FirstOrDefaultAsync(u => u.UserGUID == userInfo.UserGUID);

                    if (user == null)
                    {
                        response_data = new { status = RC.ACCOUNT_NOT_EXISTS };
                        return Results.Json(response_data);
                    }

                    if (DateTime.Now.Subtract(userInfo.DeactivationVerificationTime).TotalMinutes > 10)
                    {
                        return Results.Json(new { status = RC.VERIFICATION_CODE_EXPIRED });
                    }

                    var ctx = http.RequestServices.GetRequiredService<DataContext>();


                    try
                    {
                        ctx.Database.BeginTransaction();
                        // Mark sub accounts and sub devices to be Deleted
                        await ctx.SubAccounts.Where(o => o.AccountId == user.UserId).ExecuteUpdateAsync(o => o.SetProperty(a => a.Status, SubAccountStatus.Deleted));

                        await ctx.SubDevices.Where(d => ctx.SubAccounts.Where(acc => acc.AccountId == user.UserId).Select(acc => acc.SubAccountId).Contains(d.SubAccountId)).ExecuteUpdateAsync(o => o.SetProperty(d => d.Status, DeviceState.Deleted));

                        // delete user
                        ctx.Users.Remove(user);

                        EmailHelper.SendDeactivationConfirmationEmail(user.Email);
                        await ctx.SaveChangesAsync();
                        ctx.Database.CommitTransaction();

                        lock (cacheUsers)
                        {
                            cacheUsers.Remove(userInfo);
                        }
                    }
                    catch (Exception ex)
                    {
                        ctx.Database.RollbackTransaction();
                        throw ex;
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
        }
    }
}