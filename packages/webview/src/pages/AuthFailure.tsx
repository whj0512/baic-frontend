import { EXISTING_SYSTEM_LOGIN_URL } from '../config/api';
import './AuthFailure.css';

function AuthFailure() {
    const getLoginUrl = () => {
        let url = EXISTING_SYSTEM_LOGIN_URL;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `http://${url}`;
        }
        return url;
    };

    return (
        <div className="auth-failure-container">
            <div className="auth-failure-card">
                <div className="auth-failure-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="17" r="1" fill="currentColor" />
                    </svg>
                </div>

                <h1 className="auth-failure-title">鉴权失败</h1>
                <p className="auth-failure-desc">
                    您没有访问此系统的权限，或认证信息已过期。
                    <br />
                    请返回原系统重新登录以获取有效的访问凭证。
                </p>

                <a
                    className="auth-failure-link"
                    href={getLoginUrl()}
                    rel="noopener noreferrer"
                >
                    返回登录页
                </a>
            </div>
        </div>
    );
}

export default AuthFailure;
