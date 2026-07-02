package service

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
	"strings"
)

// SendVerificationCode 发送验证码邮件
// 使用环境变量: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
// 如果 SMTP 未配置，打印验证码到日志（开发模式）
func SendVerificationCode(email, code string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	// 如果 SMTP 未配置，进入开发模式：打印验证码到日志
	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Printf("[开发模式] 邮箱验证码 - 收件人: %s, 验证码: %s", email, code)
		return nil
	}

	// 构建邮件内容
	subject := "验证码"
	body := fmt.Sprintf(
		`<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 400px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
      <h2 style="color: #333; text-align: center;">邮箱验证</h2>
      <p style="color: #666;">您的验证码是：</p>
      <div style="font-size: 32px; font-weight: bold; color: #1890ff; text-align: center; padding: 20px 0; letter-spacing: 8px;">%s</div>
      <p style="color: #999; font-size: 14px; text-align: center;">验证码5分钟内有效，请勿泄露给他人。</p>
    </div>
  </body>
</html>`, code,
	)

	// 构建邮件（From 头只用邮箱地址）
	msg := "From: " + smtpUser + "\r\n" +
		"To: " + email + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"utf-8\"\r\n\r\n" +
		body

	// SMTP 地址
	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)

	// 认证信息
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	// 根据端口选择连接方式
	var err error
	if smtpPort == "465" {
		// 465 端口使用 SSL 连接
		err = sendMailWithSSL(addr, auth, smtpUser, []string{email}, []byte(msg))
	} else {
		// 其他端口（587等）使用 STARTTLS
		err = sendMailWithSTARTTLS(addr, auth, smtpUser, []string{email}, []byte(msg))
	}

	if err != nil {
		log.Printf("发送邮件失败: %v", err)
		return fmt.Errorf("发送验证码邮件失败")
	}

	log.Printf("验证码邮件已发送至: %s", email)
	return nil
}

// sendMailWithSSL 使用 SSL 连接发送邮件（465端口）
func sendMailWithSSL(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// 直接 SSL 连接
	tlsConfig := &tls.Config{
		ServerName: strings.Split(addr, ":")[0],
	}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("SSL 连接失败: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, strings.Split(addr, ":")[0])
	if err != nil {
		return err
	}
	defer client.Close()

	// 认证
	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("认证失败: %w", err)
		}
	}

	// 设置发件人
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("设置发件人失败: %w", err)
	}

	// 设置收件人
	for _, addr := range to {
		if err = client.Rcpt(addr); err != nil {
			return fmt.Errorf("设置收件人失败: %w", err)
		}
	}

	// 发送邮件内容
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("开始发送邮件内容失败: %w", err)
	}
	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("写入邮件内容失败: %w", err)
	}
	err = w.Close()
	if err != nil {
		return fmt.Errorf("关闭邮件内容失败: %w", err)
	}

	return client.Quit()
}

// sendMailWithSTARTTLS 使用 STARTTLS 发送邮件（587端口）
func sendMailWithSTARTTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// 先明文连接
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("连接 SMTP 服务器失败: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, strings.Split(addr, ":")[0])
	if err != nil {
		return err
	}
	defer client.Close()

	// 发送 EHLO
	if err = client.Hello("localhost"); err != nil {
		return err
	}

	// 尝试 STARTTLS
	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{
			ServerName: strings.Split(addr, ":")[0],
		}
		if err = client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("STARTTLS 失败: %w", err)
		}
	}

	// 认证
	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("认证失败: %w", err)
		}
	}

	// 设置发件人
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("设置发件人失败: %w", err)
	}

	// 设置收件人
	for _, addr := range to {
		if err = client.Rcpt(addr); err != nil {
			return fmt.Errorf("设置收件人失败: %w", err)
		}
	}

	// 发送邮件内容
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("开始发送邮件内容失败: %w", err)
	}
	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("写入邮件内容失败: %w", err)
	}
	err = w.Close()
	if err != nil {
		return fmt.Errorf("关闭邮件内容失败: %w", err)
	}

	return client.Quit()
}
