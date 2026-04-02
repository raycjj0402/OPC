import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px; color: #333; }
  .body p { line-height: 1.7; margin: 0 0 16px; }
  .info-box { background: #f8f9ff; border: 1px solid #e8eaff; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #666; font-size: 14px; }
  .info-value { color: #333; font-weight: 500; font-size: 14px; }
  .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; margin: 16px 0; }
  .footer { background: #f8f9fa; padding: 20px 32px; text-align: center; border-top: 1px solid #eee; }
  .footer p { color: #999; font-size: 12px; margin: 4px 0; }
  .footer a { color: #667eea; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>OPC 一人公司服务平台</h1>
    <p>您的创业起跑线</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© 2026 OPC平台 · 一人公司的起跑线</p>
    <p>
      <a href="#">隐私政策</a> ·
      <a href="#">退订邮件</a> ·
      <a href="#">联系客服</a>
    </p>
    <p style="color:#bbb;font-size:11px;">发件人: OPC平台 &lt;no-reply@opc-platform.com&gt;</p>
  </div>
</div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string, bookingId?: string, trigger?: string) {
  let logId: string | undefined;

  // 创建邮件日志
  try {
    const log = await prisma.emailLog.create({
      data: {
        bookingId: bookingId || null,
        recipient: to,
        subject,
        trigger: trigger || 'manual',
        status: 'PENDING',
      }
    });
    logId = log.id;
  } catch { /* ignore logging error */ }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"OPC平台" <no-reply@opc-platform.com>',
      to,
      subject,
      html,
    });

    if (logId) {
      await prisma.emailLog.update({
        where: { id: logId },
        data: { status: 'SENT', sentAt: new Date() }
      });
    }
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    if (logId) {
      await prisma.emailLog.update({
        where: { id: logId },
        data: { status: 'FAILED', errorMsg: String(err) }
      });
    }
    return false;
  }
}

// 发送验证码
export async function sendVerificationCode(email: string, code: string) {
  const html = baseTemplate(`
    <p>您好！</p>
    <p>您正在注册 OPC 一人公司服务平台账号，请使用以下验证码完成验证：</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:20px 40px;">
        <span style="font-size:36px;font-weight:700;color:#fff;letter-spacing:8px;">${code}</span>
      </div>
    </div>
    <p style="color:#666;font-size:14px;">验证码有效期为 <strong>10分钟</strong>，请勿泄露给他人。</p>
    <p style="color:#999;font-size:13px;">如果您没有注册账号，请忽略此邮件。</p>
  `);
  return sendEmail(email, '【OPC】邮箱验证码', html, undefined, 'verification_code');
}

// 支付成功通知
export async function sendPaymentSuccess(email: string, planName: string, amount: string) {
  const html = baseTemplate(`
    <p>感谢您的购买！您的 <strong>${planName}</strong> 套餐已成功开通。</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">套餐类型</span>
        <span class="info-value">${planName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">支付金额</span>
        <span class="info-value">¥${amount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">开通时间</span>
        <span class="info-value">${new Date().toLocaleString('zh-CN')}</span>
      </div>
    </div>
    <p>接下来，系统将引导您完成个性化设置，为您生成专属的学习路径。</p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/onboarding" class="btn">立即开始个性化引导 →</a>
    </div>
  `);
  return sendEmail(email, `【OPC】${planName}套餐开通成功`, html, undefined, 'payment_success');
}

// 预约提交成功通知
export async function sendBookingSubmitted(
  userEmail: string,
  expertEmail: string,
  data: { expertName: string; userName: string; date: string; description: string; bookingId: string }
) {
  const userHtml = baseTemplate(`
    <p>您好 ${data.userName}，您的专家咨询预约已提交成功！</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">预约专家</span>
        <span class="info-value">${data.expertName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询时间</span>
        <span class="info-value">${data.date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询事宜</span>
        <span class="info-value">${data.description.slice(0, 50)}${data.description.length > 50 ? '...' : ''}</span>
      </div>
    </div>
    <p style="color:#666;font-size:14px;">专家将在24小时内确认预约，届时您将收到确认邮件。</p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/profile/bookings/${data.bookingId}" class="btn">查看预约详情</a>
    </div>
    <p style="color:#999;font-size:13px;margin-top:20px;">如需取消，请至少提前24小时操作（次数可归还）。</p>
  `);

  const expertHtml = baseTemplate(`
    <p>您好 ${data.expertName}，您有一个新的咨询预约需要确认！</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">用户姓名</span>
        <span class="info-value">${data.userName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询时间</span>
        <span class="info-value">${data.date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询事宜</span>
        <span class="info-value">${data.description}</span>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/admin/bookings/${data.bookingId}" class="btn">查看并确认预约</a>
    </div>
  `);

  const subject = `【OPC】预约申请 | ${data.expertName} × ${data.userName} | ${data.date}`;
  await Promise.all([
    sendEmail(userEmail, subject, userHtml, data.bookingId, 'booking_submitted_user'),
    sendEmail(expertEmail || process.env.SMTP_USER!, subject, expertHtml, data.bookingId, 'booking_submitted_expert'),
  ]);
}

// 预约确认通知
export async function sendBookingConfirmed(
  userEmail: string,
  data: { expertName: string; userName: string; date: string; bookingId: string }
) {
  const html = baseTemplate(`
    <p>好消息！${data.expertName} 已确认您的咨询预约。</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">预约专家</span>
        <span class="info-value">${data.expertName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询时间</span>
        <span class="info-value">${data.date}</span>
      </div>
    </div>
    <p><strong>准备建议：</strong></p>
    <ul style="color:#555;line-height:2;">
      <li>提前梳理您的核心问题（3-5个最重要的）</li>
      <li>准备好您目前的商业模式或想法概述</li>
      <li>确保咨询时间前微信畅通</li>
    </ul>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/profile/bookings/${data.bookingId}" class="btn">查看预约详情</a>
    </div>
  `);
  return sendEmail(userEmail, `【OPC】预约已确认 | ${data.expertName} × ${data.userName}`, html, data.bookingId, 'booking_confirmed');
}

// 咨询前24小时提醒
export async function sendBookingReminder(
  userEmail: string,
  expertEmail: string,
  data: { expertName: string; userName: string; date: string; userWechat: string; description: string; bookingId: string }
) {
  const userHtml = baseTemplate(`
    <p>提醒您，您的专家咨询将在 <strong>24小时后</strong> 进行！</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">咨询专家</span>
        <span class="info-value">${data.expertName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询时间</span>
        <span class="info-value">${data.date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询事宜</span>
        <span class="info-value">${data.description.slice(0, 100)}</span>
      </div>
    </div>
    <p style="color:#e63946;font-weight:500;">请确保您的微信 <strong>${data.userWechat}</strong> 畅通，专家将通过微信与您联系。</p>
  `);

  const expertHtml = baseTemplate(`
    <p>提醒您，即将在 <strong>24小时后</strong> 进行一次咨询！</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">用户姓名</span>
        <span class="info-value">${data.userName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">用户微信</span>
        <span class="info-value">${data.userWechat}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询时间</span>
        <span class="info-value">${data.date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">咨询事宜</span>
        <span class="info-value">${data.description}</span>
      </div>
    </div>
  `);

  const subject = `【OPC】咨询提醒 | ${data.expertName} × ${data.userName} | 明天 ${data.date}`;
  await Promise.all([
    sendEmail(userEmail, subject, userHtml, data.bookingId, 'booking_reminder_user'),
    sendEmail(expertEmail || process.env.SMTP_USER!, subject, expertHtml, data.bookingId, 'booking_reminder_expert'),
  ]);
}

// 会后总结上传通知
export async function sendSummaryUploaded(
  userEmail: string,
  data: { expertName: string; bookingId: string; summaryUrl: string }
) {
  const html = baseTemplate(`
    <p>您的咨询会后总结文档已上传！</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">咨询专家</span>
        <span class="info-value">${data.expertName}</span>
      </div>
    </div>
    <p>请查阅总结文档，并为本次咨询进行评价，您的反馈将帮助我们持续提升服务质量。</p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/profile/bookings/${data.bookingId}" class="btn">查看总结 & 评价</a>
    </div>
  `);
  return sendEmail(userEmail, `【OPC】会后总结已上传 | ${data.expertName}`, html, data.bookingId, 'summary_uploaded');
}

// 预约取消通知
export async function sendBookingCancelled(
  userEmail: string,
  expertEmail: string,
  data: { expertName: string; userName: string; date: string; bookingId: string; refundCredits: boolean }
) {
  const userHtml = baseTemplate(`
    <p>您的咨询预约已取消。</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">预约专家</span>
        <span class="info-value">${data.expertName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">原定时间</span>
        <span class="info-value">${data.date}</span>
      </div>
    </div>
    ${data.refundCredits
      ? '<p style="color:#2d7a2d;font-weight:500;">由于您在咨询开始24小时前取消，本次预约次数已归还至您的账户。</p>'
      : '<p style="color:#e63946;">由于取消时间距咨询开始不足24小时，本次预约次数将不予归还。</p>'}
  `);

  const expertHtml = baseTemplate(`
    <p>用户 ${data.userName} 已取消预约。</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">原定时间</span>
        <span class="info-value">${data.date}</span>
      </div>
    </div>
    <p>该时间槽已重新开放，如需调整请联系运营。</p>
  `);

  const subject = `【OPC】预约已取消 | ${data.expertName} × ${data.userName}`;
  await Promise.all([
    sendEmail(userEmail, subject, userHtml, data.bookingId, 'booking_cancelled_user'),
    sendEmail(expertEmail || process.env.SMTP_USER!, subject, expertHtml, data.bookingId, 'booking_cancelled_expert'),
  ]);
}
