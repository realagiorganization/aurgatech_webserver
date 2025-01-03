using aurga.Common;
using aurga.Data;
using aurga.Model;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using System.Security.Cryptography.Pkcs;
using System.Xml.Linq;
using aurga;

#region Web app setup
var builder = WebApplication.CreateBuilder(args);

// Get EmailServer from appsettings.json
MailSender.DefaultSender.EmailServer = builder.Configuration["EmailServer"].ToString();
MailSender.DefaultSender.EmailAccount = builder.Configuration["EmailAccount"].ToString();
MailSender.DefaultSender.EmailPassword = builder.Configuration["EmailPassword"].ToString();
var websiteUrl = builder.Configuration["WebSiteUrl"].ToString();
var websiteMirrorUrl = builder.Configuration["WebSiteMirrorUrl"].ToString();
if (!string.IsNullOrEmpty(websiteUrl))SharedStore.WEBSITE_URL = websiteUrl;
if (!string.IsNullOrEmpty(websiteMirrorUrl)) SharedStore.MIRROR_URL = websiteMirrorUrl;

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

#if !MIRROR
builder.Services.AddDbContext<DataContext>();
#endif

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowMyOrigin",
        builder => builder.WithOrigins("http://localhost:5173").
        AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
});

var app = builder.Build();

#if !MIRROR
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<DataContext>();
        context.Database.EnsureCreated();
        // or use context.Database.Migrate(); if you're using migrations
    }
    catch (Exception ex)
    {
        Console.WriteLine(ex);
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred creating the DB.");
    }
}
#endif

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowMyOrigin");
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();

#endregion

#region Web app start

app.MapV1Endpoints();
app.MapV2Endpoints();
app.Run();
MailSender.DefaultSender.Stop();
#endregion

#region Records
record ReuqestRegisterUser(string? name, string Email, string Password);
record RequestLoginWithToken(string Uid, string Token, bool? IsWeb);
record RequestHeartbeat(int? v, string Payload);

record RequestBindDevice(string Uid, string Token, string Payload);
record RequestUnbindDevice(string Uid, string Token, string Did);
record RequestRenameDevice(string Uid, string Token, string Did, string Title);

record RequestSendCommandToDevice(string Uid, string Token, string Did, string?cmd, string? NAT, string? WOL, string? Payload);
record RequestDeviceAcceptConnection (string Uid, string Token, string Did);

record RequestResetPassword(string Email);
record ReguestActivationVerification(string Token, string VerificationCode);
record RequestResetPasswordVerification(string Token, string VerificationCode, string NewPassword);

record RequestAccountDeactivate(string Uid, string Token);
record RequestAccountDeactivateConfirm(string Uid, string Token, string Code);
record RequestInvitation(string Uid, string Token, string Email, string Name, string InvitedBy);
record RequestAcceptInvitation(string Uid, string Token, string InvitationCode);
record RequestUpdateSubAccountState(string Uid, string Token, int AccountId, int State);

record RequestGetSubAccountList(string Uid, string Token);

record RequestRenameSubAccount(string Uid, string Token, int AccountId, string NewName);

record RequestModifySubDevice(string Uid, string Token, long AccountId, long DeviceId, bool IsAdd);

record RequestGetMainAccountList(string Uid, string Token);

record RequestDisconnectMainAccount(string Uid, string Token, long AccountId);
#endregion
