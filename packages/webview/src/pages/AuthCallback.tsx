import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { API_ENDPOINTS, clearAuth } from '../config/api';
import { isExtensionAuthMode, loginWithEmail, saveBrowserAuth } from '../config/authClient';
import './AuthCallback.css';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthAction = async () => {
      const outerSearchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token') ?? outerSearchParams.get('token');

      if (!token) {
        navigate('/auth-failure', { replace: true });
        return;
      }

      try {
        let email = token;
        // 尝试解析 JWT 格式 token 获取 email
        // try {
        //   const payloadBase64 = token.split('.')[1];
        //   if (!payloadBase64) throw new Error("Invalid JWT format");

        //   // JWT的payload是Base64Url编码，在使用atob之前需要处理一些特殊字符
        //   const base64 = payloadBase64.replace(/-/g, '+').replace(/_/, '/');
        //   const decodedPayload = JSON.parse(decodeURIComponent(escape(atob(base64))));
        //   email = decodedPayload.email;
        // } catch (e) {
        //   console.error("Token解析失败", e);
        //   message.error('Token格式异常或解析失败');
        //   redirectToLogin();
        //   return;
        // }

        if (!email) {
          navigate('/auth-failure', { replace: true });
          return;
        }

        if (isExtensionAuthMode()) {
          const snapshot = await loginWithEmail(email);
          if (snapshot.status === 'authenticated') {
            message.success('登录成功');
            navigate('/');
          } else {
            navigate('/auth-failure', { replace: true });
          }
          return;
        }

        const response = await fetch(API_ENDPOINTS.auth, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.matched) {
          // 先清除旧的认证信息，再保存新的
          clearAuth();
          saveBrowserAuth({
            token: data.token,
            userId: data.user_id,
            username: data.email,
          });
          message.success('登录成功');
          // 登录成功后跳转到首页
          navigate('/');
        } else {
          clearAuth();
          navigate('/auth-failure', { replace: true });
        }
      } catch (error) {
        console.error('鉴权请求出错', error);
        clearAuth();
        navigate('/auth-failure', { replace: true });
      }
    };

    handleAuthAction();
  }, [searchParams, navigate]);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <h2>正在处理登录跳转...</h2>
        <p>系统正在进行鉴权，请稍候</p>
      </div>
    </div>
  );
}

export default AuthCallback;

