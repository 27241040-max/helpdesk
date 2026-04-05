import { useEffect, useState } from 'react';

function App() {
  const [healthStatus, setHealthStatus] = useState<string>('正在检查服务器状态...');

  useEffect(() => {
    // 调用后端的健康检查 API
    fetch('http://localhost:4000/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus(`服务正常运行 (${data.service}: ${data.status.toUpperCase()})`);
      })
      .catch((err) => {
        console.error('健康检查失败:', err);
        setHealthStatus('无法连接到后端服务器，请检查服务端是否运行。');
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🌌 AI Helpdesk</h1>
      <div style={{
        padding: '10px 15px', 
        marginTop: '20px',
        backgroundColor: healthStatus.includes('正常') ? '#e6f4ea' : '#fce8e6',
        color: healthStatus.includes('正常') ? '#137333' : '#c5221f',
        borderRadius: '6px',
        display: 'inline-block'
      }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>API 连接状态检查:</strong>
        {healthStatus}
      </div>
    </div>
  )
}

export default App
