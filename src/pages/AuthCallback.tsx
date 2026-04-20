import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { API_ENDPOINTS, EXISTING_SYSTEM_LOGIN_URL } from '../config/api';
import './AuthCallback.css';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToLogin = () => {
      let url = EXISTING_SYSTEM_LOGIN_URL;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`;
      }
      window.location.href = url;
    };

    const handleAuthAction = async () => {
      const token = searchParams.get('token');

      if (!token) {
        message.warning('缺少认证token，跳转至登录页');
        redirectToLogin();
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
          message.error('Token中未包含email信息');
          redirectToLogin();
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
          // 保存相关登录信息
          localStorage.setItem('token', data.token);
          localStorage.setItem('user_id', data.user_id);
          localStorage.setItem('username', data.email);
          message.success('登录成功');
          // 登录成功后跳转到首页
          navigate('/');
        } else {
          message.error('鉴权失败，该用户未授权访问此系统');
          redirectToLogin();
        }
      } catch (error) {
        console.error('鉴权请求出错', error);
        message.error('请求服务器鉴权失败');
        redirectToLogin();
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
